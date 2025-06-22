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

    // From WorkerLogic.js
     damageTree, stopCutting, cutTree, findClosestTree, sendWorkerToTree,
     startBuildingBarrack, cancelBuilding, buildStructure, stopBuilding, handleWorkerState,
     handleBarrackTraining, // Moved from combat as it relates to resource/training checks

    // From CombatLogic.js
    spawnSpearman, findClosestEnemyTarget, findClosestFriendlyBuilding,
    sendSpearmanToAttack, startAttacking, stopAttacking, damageTarget, handleSpearmanState,

    // From Visuals.js
     createHealthBar, updateHealthBar, destroyHealthBar,
     // createTreeHealthBar, updateTreeHealthBar, destroyTreeHealthBar, // DEPRECATED
     createTrainingText, updateTrainingText, destroyTrainingText,
     updateSpearmanThoughtBubble,
     // Note: takeDamage is now part of the Entity class

    // From Utilities.js
    logDebug, isPositionOccupied, findNearbyEmptyPosition, startUnitMove,

    // From GameState.js
    startGameLogic, checkEndCondition, endGame
});

// --- Special Handling for takeDamage (REFACTORED) ---
// We no longer attach takeDamage to the global prototypes.
// Instead, it's a method on the Entity class.
// We keep it for non-Entity objects for now.
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
