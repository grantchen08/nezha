// --- Attach Helper Methods to DemoScene Prototype ---
// This makes the functions defined in separate files act as methods of DemoScene instances
Object.assign(DemoScene.prototype, {
    // From FogOfWar.js
    worldToGrid,
    isCellRevealed,
    revealCell,
    areAllCellsRevealed,
    updateVisibilityAround,
    findNearestHiddenCell,

    // From InputHandling.js
    handleObjectClick,
    handleBackgroundClick,
    toggleDebugDisplay,
    changeTimeScale,

    // From CombatLogic.js
    spawnSpearman, findClosestEnemyTarget, findClosestFriendlyBuilding,
    sendSpearmanToAttack, startAttacking, stopAttacking, damageTarget, handleSpearmanState,

    // From Visuals.js
     createHealthBar, updateHealthBar, destroyHealthBar,
     createTrainingText, updateTrainingText, destroyTrainingText,
     updateSpearmanThoughtBubble,
     // Note: takeDamage is now part of the Entity class

    // From Utilities.js
    logDebug, isPositionOccupied, findNearbyEmptyPosition, startUnitMove,

    // From GameState.js
    startGameLogic, checkEndCondition, endGame
});

// --- Special Handling for takeDamage (REFACTORED) ---
// We only keep it for non-Entity objects (Spearman) during the transition.
Phaser.GameObjects.Sprite.prototype.takeDamage = takeDamage;
Phaser.GameObjects.Image.prototype.takeDamage = takeDamage;


// --- Phaser Game Configuration ---
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'phaser-game-container', // Matches div ID in HTML
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [DemoScene], // Only need to list the main scene class
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { pixelArt: true }
};

// --- Create Phaser Game Instance ---
window.onload = () => {
  const game = new Phaser.Game(config);
};
