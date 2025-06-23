/**
 * Damages the tree currently being cut by the specified worker.
 */
function damageTree(workerSprite) {
    if (!this.gameStarted || this.gameOver || !workerSprite || !workerSprite.isCutting || !workerSprite.cuttingTarget || !workerSprite.cuttingTarget.active) {
        this.stopCutting(workerSprite);
        return;
    }
    const tree = workerSprite.cuttingTarget;
    tree.takeDamage(1, workerSprite); 
}

/**
 * Stops the current cutting process for a specific worker.
 */
function stopCutting(workerSprite) {
    if (!workerSprite) return;
    const wasCutting = workerSprite.isCutting;
    if (workerSprite.cuttingTimer) { workerSprite.cuttingTimer.remove(false); workerSprite.cuttingTimer = null; }
    workerSprite.isCutting = false;
    workerSprite.cuttingTarget = null;

    if (this.chopSound && this.chopSound.isPlaying && wasCutting) {
        let otherWorker = (workerSprite === this.worker) ? this.aiWorker : this.worker;
        let otherBusySound = otherWorker && otherWorker.active && (otherWorker.isCutting || otherWorker.isBuilding);
        if (!otherBusySound) this.chopSound.stop();
    }
    if (wasCutting) {
        workerSprite.setTexture('worker_sheet');
        workerSprite.anims.stop('worker_chop');
        workerSprite.setFrame(0);
        workerSprite.setFlipX(false);
    }
}

/**
 * DEPRECATED: This logic is now handled inside Tree.js in the die() method.
 */
function cutTree(tree, workerSprite) {
    console.warn("cutTree() is deprecated.");
}

/**
 * Finds the closest *visible* active tree to the specified worker.
 */
function findClosestTree(workerSprite) {
  if (!workerSprite || !this.trees) return null;
  const isPlayer = workerSprite.getData('isPlayer');
  const activeTrees = this.trees.getChildren().filter(tree => tree.active);
  if (activeTrees.length === 0) return null;

  let closestVisibleTree = null;
  let minDistance = Infinity;

  activeTrees.forEach(tree => {
      const { gridX, gridY } = this.worldToGrid(tree.x, tree.y);
      const isVisible = this.isCellRevealed(gridX, gridY, isPlayer);
      
      if (!isVisible) return;
      
      let isTreeBusy = false;
      const otherWorker = isPlayer ? this.aiWorker : this.worker;
      if (otherWorker && otherWorker.active && (otherWorker.cuttingTarget === tree || (otherWorker.target === tree && otherWorker.state === 'moving_to_chop'))){
          isTreeBusy = true;
      }
      if (isTreeBusy) return;

      const distance = Phaser.Math.Distance.Between(workerSprite.x, workerSprite.y, tree.x, tree.y);
      if (distance < minDistance) {
          minDistance = distance;
          closestVisibleTree = tree;
      }
  });

  return closestVisibleTree;
}

/**
 * Sends the specified worker to move towards and cut a specific tree.
 */
function sendWorkerToTree(workerSprite, tree) {
    if (!tree || !tree.active || !workerSprite || !workerSprite.active || this.gameOver) { return; }
    
    if (workerSprite.isCutting) this.stopCutting(workerSprite);
    if (workerSprite.isBuilding) this.stopBuilding(workerSprite);
    if (workerSprite.moving) this.tweens.killTweensOf(workerSprite);

    workerSprite.target = tree;
    const offset = 30;
    const targetX = workerSprite.x <= tree.x ? tree.x - offset : tree.x + offset;
    const targetY = tree.y;

    this.startUnitMove(workerSprite, targetX, targetY, 'moving_to_chop', 'chopping_init');
}


/**
 * Starts the process of building a barrack for a specific side.
 */
function startBuildingBarrack(workerSprite, side = 'player') {
    const isPlayer = side === 'player';
    const woodCount = isPlayer ? this.wood : this.aiWood;
    const existingBarrack = isPlayer ? this.playerBarrack : this.aiBarrack;
    const isBuildingThisBarrack = isPlayer ? this.playerBarrackBuilding : this.aiBarrackBuilding;
    const house = isPlayer ? this.house : this.aiHouse;

    if (!workerSprite || !workerSprite.active || !house || !house.active || (existingBarrack && existingBarrack.active) || isBuildingThisBarrack || woodCount < BARRACK_WOOD_COST ) return;

    this.logDebug(`Starting ${side} barrack construction.`);
    if (isPlayer) { this.playerBarrackBuilding = true; this.wood -= BARRACK_WOOD_COST; this.woodText.setText('Wood: ' + this.wood); }
    else { this.aiBarrackBuilding = true; this.aiWood -= BARRACK_WOOD_COST; this.aiWoodText.setText('AI Wood: ' + this.aiWood); }

    if (workerSprite.isCutting) this.stopCutting(workerSprite);
    if (workerSprite.isBuilding) this.stopBuilding(workerSprite);
    if (workerSprite.moving) this.tweens.killTweensOf(workerSprite);

    const buildX = isPlayer ? house.x + 80 : house.x - 80;
    const buildY = house.y;

    const newBarrack = new Barrack(this, buildX, buildY, isPlayer, true);
    
    if (isPlayer) { this.playerBarrack = newBarrack; } else { this.aiBarrack = newBarrack; }

    this.updateVisibilityAround(newBarrack);

    workerSprite.target = newBarrack;
    const offset = 40;
    const targetXBuild = workerSprite.x <= buildX ? buildX - offset : buildX + offset;

    this.startUnitMove(workerSprite, targetXBuild, buildY, 'moving_to_build', 'building_init');
}

/**
 * Cancels the building process, destroys the placeholder, refunds wood.
 */
function cancelBuilding(barrackPlaceholder, side, woodCost) {
    if (!barrackPlaceholder || !barrackPlaceholder.active) return;
    this.logDebug(`Cancelling ${side} barrack construction.`);
    barrackPlaceholder.destroy();
    
    const isPlayer = side === 'player';
    if (isPlayer) { this.playerBarrack = null; this.playerBarrackBuilding = false; this.wood += woodCost; this.woodText.setText('Wood: ' + this.wood); }
    else { this.aiBarrack = null; this.aiBarrackBuilding = false; this.aiWood += woodCost; this.aiWoodText.setText('AI Wood: ' + this.aiWood); }
}

/**
 * Increases health of the structure being built.
 */
function buildStructure(workerSprite) {
    if (this.gameOver || !workerSprite || !workerSprite.active || !workerSprite.isBuilding || !workerSprite.buildingTarget || !workerSprite.buildingTarget.active) {
        this.stopBuilding(workerSprite);
        return;
    }
    const building = workerSprite.buildingTarget;
    building.health += 1;
    building.updateHealthBar();
    building.setAlpha(0.5 + 0.5 * (building.health / building.maxHealth));

    if (building.health >= building.maxHealth) {
        building.completeConstruction();
        this.stopBuilding(workerSprite);
        workerSprite.state = 'idle';
    }
}

/**
 * Stops the current building process for a specific worker.
 */
function stopBuilding(workerSprite) {
  if (!workerSprite || !workerSprite.isBuilding) return;
  const wasBuilding = workerSprite.isBuilding;
  if (workerSprite.buildingTimer) { workerSprite.buildingTimer.remove(false); workerSprite.buildingTimer = null; }
  
  if (this.chopSound && this.chopSound.isPlaying && wasBuilding) {
      const otherWorker = (workerSprite === this.worker) ? this.aiWorker : this.worker;
      const otherWorkerBusy = otherWorker && otherWorker.active && (otherWorker.isCutting || otherWorker.isBuilding);
      if (!otherWorkerBusy) this.chopSound.stop();
  }
  workerSprite.isBuilding = false;
  workerSprite.buildingTarget = null;
  workerSprite.setTexture('worker_sheet');
  workerSprite.anims.stop('worker_chop');
  workerSprite.setFrame(0);
  workerSprite.setFlipX(false);
}

/**
 * Handles a worker's state machine logic.
 */
function handleWorkerState(workerSprite) {
    if (!this.gameStarted || this.gameOver || !workerSprite || !workerSprite.active) return;

    if (this.selectedWorker === workerSprite) return;

    if (workerSprite.moving || workerSprite.isCutting || workerSprite.isBuilding) return;
    
    const workerId = workerSprite.getData('isPlayer') ? 'Player' : 'AI';
    const isPlayer = workerSprite.getData('isPlayer');

    if (workerSprite.state === 'chopping_init') {
        if (!workerSprite.target || !workerSprite.target.active) {
            workerSprite.state = 'idle';
            return;
        }
        workerSprite.state = 'chopping';
        workerSprite.isCutting = true;
        workerSprite.cuttingTarget = workerSprite.target;
        workerSprite.setFlipX(workerSprite.x > workerSprite.cuttingTarget.x);
        workerSprite.setTexture('worker_chop_sheet').play('worker_chop');
        
        // BUG FIX: Start chop sound
        const otherWorker = isPlayer ? this.aiWorker : this.worker;
        if (this.chopSound && !this.chopSound.isPlaying) {
             let otherWorkerBusy = otherWorker && otherWorker.active && (otherWorker.isCutting || otherWorker.isBuilding);
             if (!otherWorkerBusy) this.chopSound.play({ loop: true });
        }

        workerSprite.cuttingTimer = this.time.addEvent({ delay: 1000, callback: () => this.damageTree(workerSprite), callbackScope: this, loop: true });
        return;
    }
    
    if (workerSprite.state === 'building_init') {
         if (!workerSprite.target || !workerSprite.target.active) {
            workerSprite.state = 'idle';
            return;
        }
        workerSprite.state = 'building';
        workerSprite.isBuilding = true;
        workerSprite.buildingTarget = workerSprite.target;
        workerSprite.setFlipX(workerSprite.x > workerSprite.buildingTarget.x);
        workerSprite.setTexture('worker_chop_sheet').play('worker_chop');
        
        // BUG FIX: Start chop sound
        const otherWorker = isPlayer ? this.aiWorker : this.worker;
        if (this.chopSound && !this.chopSound.isPlaying) {
             let otherWorkerBusy = otherWorker && otherWorker.active && (otherWorker.isCutting || otherWorker.isBuilding);
             if (!otherWorkerBusy) this.chopSound.play({ loop: true });
        }

        workerSprite.buildingTimer = this.time.addEvent({ delay: 1000, callback: () => this.buildStructure(workerSprite), callbackScope: this, loop: true });
        return;
    }

    // --- Autonomous Job Seeking ---
    const side = isPlayer ? 'player' : 'ai';
    
    const woodCount = isPlayer ? this.wood : this.aiWood;
    const existingBarrack = isPlayer ? this.playerBarrack : this.aiBarrack;
    const isBuildingThisBarrack = isPlayer ? this.playerBarrackBuilding : this.aiBarrackBuilding;
    if (!(existingBarrack && existingBarrack.active) && !isBuildingThisBarrack && woodCount >= BARRACK_WOOD_COST) {
        this.startBuildingBarrack(workerSprite, side);
        return;
    }

    const closestVisibleTree = this.findClosestTree(workerSprite);
    if (closestVisibleTree) {
        this.sendWorkerToTree(workerSprite, closestVisibleTree);
    } else {
        const nearestHidden = this.findNearestHiddenCell(workerSprite, isPlayer);
        if (nearestHidden) {
            this.logDebug(`${side} worker found no visible trees. Exploring to (${nearestHidden.gridX}, ${nearestHidden.gridY}).`);
            const targetX = nearestHidden.gridX * FOG_CELL_SIZE + FOG_CELL_SIZE / 2;
            const targetY = nearestHidden.gridY * FOG_CELL_SIZE + FOG_CELL_SIZE / 2;
            this.startUnitMove(workerSprite, targetX, targetY, 'moving_to_explore', 'idle');
        } else {
            workerSprite.state = 'idle';
        }
    }
}

/**
 * DEPRECATED: This logic is now handled inside the Barrack class's update method.
 */
function handleBarrackTraining(barrack, isPlayer) {
    console.warn("handleBarrackTraining() is deprecated.");
}
