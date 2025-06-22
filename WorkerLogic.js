/**
 * Damages the tree currently being cut by the specified worker.
 * REFACTORED: Now calls the tree's own takeDamage method.
 */
function damageTree(workerSprite) {
    if (!this.gameStarted || this.gameOver || !workerSprite || !workerSprite.isCutting || !workerSprite.cuttingTarget || !workerSprite.cuttingTarget.active) {
        this.stopCutting(workerSprite);
        return;
    }
    const tree = workerSprite.cuttingTarget;
    // The Tree object now handles its own damage, frame changes, and death.
    tree.takeDamage(1, workerSprite); 
}

/**
 * Stops the current cutting process for a specific worker.
 */
  function stopCutting(workerSprite) {
  if (!workerSprite) return;
  const treeToStopCutting = workerSprite.cuttingTarget; const initialHealth = workerSprite.initialChopHealth; let wasCutting = workerSprite.isCutting;
  if (workerSprite.cuttingTimer) { workerSprite.cuttingTimer.remove(false); workerSprite.cuttingTimer = null; }
  workerSprite.isCutting = false; workerSprite.cuttingTarget = null; workerSprite.initialChopHealth = null;
  if (this.chopSound && this.chopSound.isPlaying && wasCutting) {
      let otherWorker = (workerSprite === this.worker) ? this.aiWorker : this.worker;
      let otherBusySound = otherWorker && otherWorker.active && (otherWorker.isCutting || otherWorker.isBuilding);
      if (!otherBusySound) this.chopSound.stop();
  }
  if(wasCutting) { workerSprite.setTexture('worker_sheet'); workerSprite.anims.stop('worker_chop'); workerSprite.setFrame(0); workerSprite.setFlipX(false); }
  if (wasCutting && treeToStopCutting && treeToStopCutting.active && initialHealth !== null) {
      if (treeToStopCutting.health > 0) {
          const healthLost = initialHealth - treeToStopCutting.health; const woodGained = Math.max(0, Math.floor(healthLost));
          if (woodGained > 0) {
              if (workerSprite === this.worker) { this.wood += woodGained; this.woodText.setText('Wood: ' + this.wood); this.logDebug(`Stopped chopping. Gained ${woodGained} wood (partial).`); }
              else if (workerSprite === this.aiWorker) { this.aiWood += woodGained; this.aiWoodText.setText('AI Wood: ' + this.aiWood); this.logDebug(`AI stopped chopping. Gained ${woodGained} wood (partial).`); }
              this.checkEndCondition();
          } else { this.logDebug(`Stopped chopping. No partial wood gained.`); }
          // The tree's health bar is now managed by its own preUpdate
      }
  }
}


/**
 * Finalizes cutting the tree, adds wood, removes tree, checks end condition.
 * NOTE: This function is now effectively replaced by Tree.die() but is kept for reference during transition.
 * The core logic has moved to Tree.js.
 */
function cutTree(tree, workerSprite) {
    // This logic is now handled inside Tree.js in the die() method.
    // The call to tree.takeDamage() will trigger this when the tree's health is <= 0.
    console.warn("cutTree() is deprecated and should not be called directly.");
}

/**
 * Finds the closest *visible* active tree to the specified worker, based on their perspective.
 */
function findClosestTree(workerSprite) {
  if (!workerSprite || !this.trees) return null;

  const isPlayer = workerSprite.getData('isPlayer'); // Determine perspective
  const activeTrees = this.trees.getChildren().filter(tree => tree.active);
  if (activeTrees.length === 0) return null;

  let closestVisibleTree = null;
  let minDistance = Infinity;

  activeTrees.forEach(tree => {
      // --- Visibility Check (using perspective) ---
      const { gridX, gridY } = this.worldToGrid(tree.x, tree.y);
      if (!this.isCellRevealed(gridX, gridY, isPlayer)) { // Check correct grid
          return; // Skip this tree, it's in the fog for this unit
      }
      // --- End Visibility Check ---

      // --- Target Avoidance Logic ---
      let isTreeBusy = false;
      // Check player worker (if not self)
      if (this.worker && this.worker.active && this.worker !== workerSprite) {
          if (this.worker.isCutting && this.worker.cuttingTarget === tree) isTreeBusy = true;
          if (this.worker.moving && this.worker.target === tree && this.worker.state === 'moving_to_chop') isTreeBusy = true;
      }
      // Check AI worker (if not self)
      if (this.aiWorker && this.aiWorker.active && this.aiWorker !== workerSprite) {
          if (this.aiWorker.isCutting && this.aiWorker.cuttingTarget === tree) isTreeBusy = true;
          if (this.aiWorker.moving && this.aiWorker.target === tree && this.aiWorker.state === 'moving_to_chop') isTreeBusy = true;
      }
      if (isTreeBusy) return; // Skip this tree, it's claimed
      // --- End Target Avoidance ---

      const distance = Phaser.Math.Distance.Between(workerSprite.x, workerSprite.y, tree.x, tree.y);
      if (distance < minDistance) {
          minDistance = distance;
          closestVisibleTree = tree;
      }
  });

  return closestVisibleTree; // Return the closest one that is visible and not busy
}

/**
 * Sends the specified worker to move towards and cut a specific tree.
 */
function sendWorkerToTree(workerSprite, tree) {
  if (!tree || !tree.active || !workerSprite || !workerSprite.active || this.gameOver) { this.logDebug('Cannot send worker: Invalid target/worker or game over.'); return; }
  const workerId = workerSprite.getData('isPlayer') ? 'Player' : 'AI';
  this.logDebug(`Sending ${workerId} worker to tree.`);
  if (workerSprite.isCutting) this.stopCutting(workerSprite);
  if (workerSprite.isBuilding) this.stopBuilding(workerSprite);
  if (workerSprite.moving) {
      this.tweens.killTweensOf(workerSprite); workerSprite.moving = false;
      workerSprite.setTexture('worker_sheet'); workerSprite.anims.stop(); workerSprite.setFrame(0); workerSprite.setFlipX(false);
      if (this.workerWalkSound && this.workerWalkSound.isPlaying) { let otherWorker = workerId === 'Player' ? this.aiWorker : this.worker; if (!otherWorker || !otherWorker.active || !otherWorker.moving) this.workerWalkSound.stop(); }
  }
  workerSprite.target = null; workerSprite.cuttingTarget = null; workerSprite.buildingTarget = null; workerSprite.initialChopHealth = null;
  workerSprite.target = tree; workerSprite.moving = true; workerSprite.state = 'moving_to_chop';
  const offset = 30; const targetY = tree.y; let targetX; let faceRightOnArrival;
  if (workerSprite.x <= tree.x) { targetX = tree.x - offset; faceRightOnArrival = true; }
  else { targetX = tree.x + offset; faceRightOnArrival = false; }
  this.logDebug(`${workerId} worker moving to tree at (${Math.round(tree.x)}, ${Math.round(tree.y)}). Target: (${Math.round(targetX)}, ${Math.round(targetY)})`);
  const distance = Phaser.Math.Distance.Between(workerSprite.x, workerSprite.y, targetX, targetY);
  const speed = 100; const duration = (distance / speed) * 1000 || 1;
  workerSprite.anims.play('worker_walk', true);
  if (this.workerWalkSound && !this.workerWalkSound.isPlaying) { let otherWorker = workerId === 'Player' ? this.aiWorker : this.worker; if (!otherWorker || !otherWorker.active || !otherWorker.moving) this.workerWalkSound.play({ loop: true }); }
  if (targetX < workerSprite.x) workerSprite.setFlipX(true); else workerSprite.setFlipX(false);
  this.tweens.add({
    targets: workerSprite, x: targetX, y: targetY, duration: duration, ease: 'Linear',
    onComplete: () => {
        if (!workerSprite.active || workerSprite.state !== 'moving_to_chop' || !workerSprite.target || !workerSprite.target.active) {
            if (workerSprite.active && workerSprite.state === 'moving_to_chop') { this.logDebug(`${workerId} reached location, but target invalid or state changed.`); workerSprite.state = 'idle'; workerSprite.setTexture('worker_sheet'); workerSprite.anims.stop(); workerSprite.setFrame(0); workerSprite.setFlipX(false); }
            workerSprite.moving = false; workerSprite.target = null;
            if (this.workerWalkSound && this.workerWalkSound.isPlaying) { let otherWorker = workerId === 'Player' ? this.aiWorker : this.worker; if (!otherWorker || !otherWorker.active || !otherWorker.moving) this.workerWalkSound.stop(); }
            return;
        }
        workerSprite.moving = false;
        if (this.workerWalkSound && this.workerWalkSound.isPlaying) { let otherWorker = workerId === 'Player' ? this.aiWorker : this.worker; if (!otherWorker || !otherWorker.active || !otherWorker.moving) this.workerWalkSound.stop(); }
        const actualTree = workerSprite.target; workerSprite.target = null;
        let otherWorker = workerId === 'Player' ? this.aiWorker : this.worker;
          if (otherWorker && otherWorker.active && ((otherWorker.isCutting && otherWorker.cuttingTarget === actualTree) || (otherWorker.moving && otherWorker.target === actualTree && otherWorker.state === 'moving_to_chop'))) {
              this.logDebug(`${workerId} Tree claimed by other worker. Finding another.`); workerSprite.state = 'chopping'; workerSprite.setTexture('worker_sheet'); workerSprite.anims.stop(); workerSprite.setFrame(0); return;
          }
        workerSprite.state = 'chopping'; workerSprite.isCutting = true; workerSprite.cuttingTarget = actualTree; workerSprite.initialChopHealth = actualTree.health;
        this.logDebug(`${workerId} reached tree. Starting cut (H:${actualTree.health})`);
        // The tree now manages its own health bar, so we don't create one here.
        workerSprite.setFlipX(!faceRightOnArrival); workerSprite.setTexture('worker_chop_sheet'); workerSprite.anims.play('worker_chop', true);
          if (this.chopSound && !this.chopSound.isPlaying) { let otherWorkerBusy = otherWorker && otherWorker.active && (otherWorker.isCutting || otherWorker.isBuilding); if (!otherWorkerBusy) this.chopSound.play({ loop: true }); }
        workerSprite.cuttingTimer = this.time.addEvent({ delay: 1000, callback: () => this.damageTree(workerSprite), callbackScope: this, loop: true });
    },
    onStop: () => {
        if (!workerSprite.active) return; const wasMoving = workerSprite.moving; workerSprite.moving = false; workerSprite.target = null;
        if (workerSprite.state === 'moving_to_chop') { workerSprite.state = 'chopping'; this.logDebug(`${workerId} worker move to tree interrupted, trying to find tree.`); }
        else if (workerSprite.state === 'moving_to_idle'){ workerSprite.state = 'idle'; this.logDebug(`${workerId} worker move interrupted, going idle.`); }
        if(wasMoving) { workerSprite.setTexture('worker_sheet'); workerSprite.anims.stop(); workerSprite.setFrame(0); workerSprite.setFlipX(false); }
        if (this.workerWalkSound && this.workerWalkSound.isPlaying && wasMoving) { let otherWorker = workerId === 'Player' ? this.aiWorker : this.worker; if (!otherWorker || !otherWorker.active || !otherWorker.moving) this.workerWalkSound.stop(); }
    }
  });
}

  /**
   * Starts the process of building a barrack for a specific side.
   */
  function startBuildingBarrack(workerSprite, side = 'player') {
  const isPlayer = side === 'player'; const woodCount = isPlayer ? this.wood : this.aiWood; const existingBarrack = isPlayer ? this.playerBarrack : this.aiBarrack;
  const isBuildingThisBarrack = isPlayer ? this.playerBarrackBuilding : this.aiBarrackBuilding; const house = isPlayer ? this.house : this.aiHouse; const woodCost = BARRACK_WOOD_COST;
  if (!workerSprite || !workerSprite.active || !house || !house.active || (existingBarrack && existingBarrack.active) || isBuildingThisBarrack || woodCount < woodCost ) { if (!isPlayer && workerSprite.state === 'idle') workerSprite.state = 'chopping'; return; }
  this.logDebug(`Starting ${side} barrack construction.`);
  if (isPlayer) { this.playerBarrackBuilding = true; this.wood -= woodCost; this.woodText.setText('Wood: ' + this.wood); }
  else { this.aiBarrackBuilding = true; this.aiWood -= woodCost; this.aiWoodText.setText('AI Wood: ' + this.aiWood); }
  if (workerSprite.isCutting) this.stopCutting(workerSprite); if (workerSprite.isBuilding) this.stopBuilding(workerSprite);
  if (workerSprite.moving) { this.tweens.killTweensOf(workerSprite); workerSprite.moving = false; workerSprite.target = null; workerSprite.setTexture('worker_sheet'); workerSprite.anims.stop(); workerSprite.setFrame(0); workerSprite.setFlipX(false); if (this.workerWalkSound && this.workerWalkSound.isPlaying) { let otherWorker = isPlayer ? this.aiWorker : this.worker; if (!otherWorker || !otherWorker.active || !otherWorker.moving) this.workerWalkSound.stop(); } }
  workerSprite.cuttingTarget = null; workerSprite.buildingTarget = null; workerSprite.initialChopHealth = null;
  const buildX = isPlayer ? house.x + 80 : house.x - 80; const buildY = house.y;
  const newBarrack = this.add.sprite(buildX, buildY, 'barrack').setOrigin(0.5, 1);
  newBarrack.health = 0; newBarrack.maxHealth = BARRACK_HEALTH; newBarrack.isBuilding = true; newBarrack.isTraining = false; newBarrack.trainingTimer = null; newBarrack.trainingText = null;
  newBarrack.setData('unitType', 'barrack'); newBarrack.setData('isPlayer', isPlayer); newBarrack.setAlpha(0.5);
  const barColor = isPlayer ? PLAYER_HEALTH_BAR_COLOR : AI_HEALTH_BAR_COLOR; this.createHealthBar(newBarrack, BUILDING_HEALTH_BAR_WIDTH, barColor);
  if (isPlayer) { this.playerBarrack = newBarrack; } else { this.aiBarrack = newBarrack; }
  // --- Make barrack interactive ---
  newBarrack.setInteractive();
  // --- Reveal FoW for the placeholder immediately ---
  this.updateVisibilityAround(newBarrack);
  // --- Send worker to build site ---
  workerSprite.state = 'moving_to_build'; workerSprite.target = newBarrack;
  const offset = 40; const targetYBuild = buildY; let targetXBuild; let faceRightOnArrivalBuild;
  if (workerSprite.x <= buildX) { targetXBuild = buildX - offset; faceRightOnArrivalBuild = true; } else { targetXBuild = buildX + offset; faceRightOnArrivalBuild = false; }
  const distance = Phaser.Math.Distance.Between(workerSprite.x, workerSprite.y, targetXBuild, targetYBuild); const speed = 100; const duration = (distance / speed) * 1000 || 1;
  workerSprite.anims.play('worker_walk', true); if (targetXBuild < workerSprite.x) workerSprite.setFlipX(true); else workerSprite.setFlipX(false); workerSprite.moving = true;
  if (this.workerWalkSound && !this.workerWalkSound.isPlaying) { let otherWorker = isPlayer ? this.aiWorker : this.worker; if (!otherWorker || !otherWorker.active || !otherWorker.moving) this.workerWalkSound.play({ loop: true }); }
  this.tweens.add({
      targets: workerSprite, x: targetXBuild, y: targetYBuild, duration: duration, ease: 'Linear',
      onComplete: () => {
          if (!workerSprite.active || workerSprite.state !== 'moving_to_build' || !workerSprite.target || !workerSprite.target.active) {
              if(workerSprite.active && workerSprite.state === 'moving_to_build') { this.logDebug(`${side} worker reached build site, but target invalid or state changed.`); workerSprite.state = 'idle'; workerSprite.setTexture('worker_sheet'); workerSprite.anims.stop(); workerSprite.setFrame(0); workerSprite.setFlipX(false); const barrackToCancel = workerSprite.target; if (barrackToCancel && barrackToCancel.active && barrackToCancel.isBuilding) { this.cancelBuilding(barrackToCancel, side, woodCost); } else { if(isPlayer) this.playerBarrackBuilding = false; else this.aiBarrackBuilding = false; } }
              workerSprite.moving = false; workerSprite.target = null;
              if (this.workerWalkSound && this.workerWalkSound.isPlaying) { let otherWorker = isPlayer ? this.aiWorker : this.worker; if (!otherWorker || !otherWorker.active || !otherWorker.moving) this.workerWalkSound.stop(); }
              return;
          }
          workerSprite.moving = false;
          if (this.workerWalkSound && this.workerWalkSound.isPlaying) { let otherWorker = isPlayer ? this.aiWorker : this.worker; if (!otherWorker || !otherWorker.active || !otherWorker.moving) this.workerWalkSound.stop(); }
          workerSprite.state = 'building'; workerSprite.isBuilding = true; workerSprite.buildingTarget = workerSprite.target;
          this.logDebug(`${side} worker arrived at build site. Starting construction.`);
          workerSprite.setFlipX(!faceRightOnArrivalBuild); workerSprite.setTexture('worker_chop_sheet'); workerSprite.anims.play('worker_chop', true);
          if (this.chopSound && !this.chopSound.isPlaying) { let otherWorker = isPlayer ? this.aiWorker : this.worker; let otherWorkerBusy = otherWorker && otherWorker.active && (otherWorker.isCutting || otherWorker.isBuilding); if (!otherWorkerBusy) this.chopSound.play({ loop: true }); }
          workerSprite.buildingTimer = this.time.addEvent({ delay: 1000, callback: () => this.buildStructure(workerSprite), callbackScope: this, loop: true });
      },
      onStop: () => {
          if (!workerSprite.active) return; const wasMoving = workerSprite.moving; workerSprite.moving = false;
          if (workerSprite.state === 'moving_to_build') { workerSprite.state = 'idle'; this.logDebug(`${side} worker move to build site interrupted.`); const barrackToCancel = workerSprite.target; if(barrackToCancel && barrackToCancel.active && barrackToCancel.isBuilding) { this.cancelBuilding(barrackToCancel, side, woodCost); } else { if(isPlayer) this.playerBarrackBuilding = false; else this.aiBarrackBuilding = false; } }
          workerSprite.target = null;
          if(wasMoving) { workerSprite.setTexture('worker_sheet'); workerSprite.anims.stop(); workerSprite.setFrame(0); workerSprite.setFlipX(false); }
          if (this.workerWalkSound && this.workerWalkSound.isPlaying && wasMoving) { let otherWorker = isPlayer ? this.aiWorker : this.worker; if (!otherWorker || !otherWorker.active || !otherWorker.moving) this.workerWalkSound.stop(); }
      }
  });
  }

/**
 * Cancels the building process, destroys the placeholder, refunds wood.
 */
function cancelBuilding(barrackPlaceholder, side, woodCost) {
    if (!barrackPlaceholder || !barrackPlaceholder.active) return;
    this.logDebug(`Cancelling ${side} barrack construction.`); this.destroyHealthBar(barrackPlaceholder); this.destroyTrainingText(barrackPlaceholder); barrackPlaceholder.destroy();
    const isPlayer = side === 'player';
    if (isPlayer) { this.playerBarrack = null; this.playerBarrackBuilding = false; this.wood += woodCost; this.woodText.setText('Wood: ' + this.wood); this.logDebug(`Player refunded ${woodCost} wood.`); }
    else { this.aiBarrack = null; this.aiBarrackBuilding = false; this.aiWood += woodCost; this.aiWoodText.setText('AI Wood: ' + this.aiWood); this.logDebug(`AI refunded ${woodCost} wood.`); }
}


/**
 * Increases health of the structure being built. Reveals FoW on completion.
 */
function buildStructure(workerSprite) {
  if (this.gameOver || !workerSprite || !workerSprite.active || !workerSprite.isBuilding || !workerSprite.buildingTarget || !workerSprite.buildingTarget.active) {
      this.stopBuilding(workerSprite);
      if(workerSprite && workerSprite.active && workerSprite.isBuilding && !workerSprite.buildingTarget) { const side = workerSprite.getData('isPlayer') ? 'player' : 'ai'; this.logDebug(`Build target disappeared while ${side} worker was building.`); this.stopBuilding(workerSprite); workerSprite.state = 'idle'; }
      return;
  }
  const building = workerSprite.buildingTarget; building.health += 1;
  this.updateHealthBar(building); building.setAlpha(0.5 + 0.5 * (building.health / building.maxHealth));
  if (building.health >= building.maxHealth) {
      building.health = building.maxHealth; building.setAlpha(1); building.isBuilding = false;
      this.updateHealthBar(building);
      const side = workerSprite.getData('isPlayer') ? 'Player' : 'AI'; this.logDebug(`${side} barrack construction complete!`);
      if (workerSprite.getData('isPlayer')) { this.playerBarrackBuilding = false; } else { this.aiBarrackBuilding = false; }
      // --- Reveal FoW for the completed building ---
      this.updateVisibilityAround(building); // Use the perspective of the building itself
      // --- Stop worker ---
      this.stopBuilding(workerSprite); workerSprite.state = 'chopping'; // Send worker back to chopping after building
  }
  }

/**
 * Stops the current building process for a specific worker.
 */
function stopBuilding(workerSprite) {
  if (!workerSprite || !workerSprite.isBuilding) return;
  // const side = workerSprite.getData('isPlayer') ? 'Player' : 'AI'; // Logging removed for brevity
  if (workerSprite.buildingTimer) { workerSprite.buildingTimer.remove(false); workerSprite.buildingTimer = null; }
  if (this.chopSound && this.chopSound.isPlaying) { const otherWorker = (workerSprite === this.worker) ? this.aiWorker : this.worker; const otherWorkerBusy = otherWorker && otherWorker.active && (otherWorker.isCutting || otherWorker.isBuilding); if (!otherWorkerBusy) this.chopSound.stop(); }
  workerSprite.isBuilding = false; workerSprite.buildingTarget = null; workerSprite.setTexture('worker_sheet'); workerSprite.anims.stop('worker_chop'); workerSprite.setFrame(0); workerSprite.setFlipX(false);
  }


/**
 * Handles a worker's state machine logic, including exploring nearest hidden cell.
 */
function handleWorkerState(workerSprite) {
  if (!this.gameStarted || this.gameOver || !workerSprite || !workerSprite.active) return;
  // Don't let AI act if player has selected it (for potential future features)
  if (this.selectedWorker === workerSprite && !workerSprite.getData('isPlayer')) return;

  const isPlayer = workerSprite.getData('isPlayer');
  const side = isPlayer ? 'player' : 'ai';

  // --- Check for Build Order (only if idle-like state) ---
  if (!workerSprite.moving && !workerSprite.isCutting && !workerSprite.isBuilding && workerSprite.state !== 'moving_to_explore') {
      const woodCount = isPlayer ? this.wood : this.aiWood; const existingBarrack = isPlayer ? this.playerBarrack : this.aiBarrack;
      const isBuildingThisBarrack = isPlayer ? this.playerBarrackBuilding : this.aiBarrackBuilding; const house = isPlayer ? this.house : this.aiHouse;
      if (house && house.active && !(existingBarrack && existingBarrack.active) && !isBuildingThisBarrack && woodCount >= BARRACK_WOOD_COST) {
          this.startBuildingBarrack(workerSprite, side); return;
      }
  }

  // --- Default Actions (Chopping/Idle/Explore) ---
  // Only act if the worker is not currently busy moving, cutting, or building
  if (!workerSprite.moving && !workerSprite.isCutting && !workerSprite.isBuilding) {
      if (workerSprite.state === 'chopping' || workerSprite.state === 'idle') {
          const closestVisibleTree = this.findClosestTree(workerSprite); // Uses perspective
          if (closestVisibleTree) {
              if (workerSprite.state === 'idle') this.logDebug(`${side} worker idle, found visible tree.`);
              this.sendWorkerToTree(workerSprite, closestVisibleTree);
          } else {
              // No visible trees left - find nearest hidden cell to explore
              const nearestHidden = this.findNearestHiddenCell(workerSprite, isPlayer); // Use perspective
              if (nearestHidden) {
                  this.logDebug(`No visible trees. ${side} Worker exploring nearest hidden cell at (${nearestHidden.gridX}, ${nearestHidden.gridY}).`);
                  const targetX = nearestHidden.gridX * FOG_CELL_SIZE + FOG_CELL_SIZE / 2;
                  const targetY = nearestHidden.gridY * FOG_CELL_SIZE + FOG_CELL_SIZE / 2;
                  this.startUnitMove(workerSprite, targetX, targetY, 'moving_to_explore', 'idle'); // Move to explore, become idle on arrival
              } else {
                  // No visible trees AND no hidden cells - truly idle
                  if (workerSprite.state !== 'idle') {
                      this.logDebug(`No visible trees or hidden cells. ${side} Worker truly idle.`);
                      workerSprite.state = 'idle';
                      workerSprite.setTexture('worker_sheet'); workerSprite.anims.stop(); workerSprite.setFrame(0); workerSprite.setFlipX(false);
                  }
                  // Check for draw condition if truly idle
                  if (this.trees.countActive(true) === 0) this.checkEndCondition();
              }
          }
      }
      // Reset state if somehow stuck
      else if (workerSprite.state === 'moving_to_chop' || workerSprite.state === 'moving_to_idle' || workerSprite.state === 'moving_to_build' || workerSprite.state === 'building' || workerSprite.state === 'moving_to_explore') {
          this.logDebug(`${side} Worker stuck in ${workerSprite.state} without flag. Resetting to idle.`);
          workerSprite.state = 'idle'; workerSprite.setTexture('worker_sheet'); workerSprite.anims.stop(); workerSprite.setFrame(0); workerSprite.setFlipX(false);
      }
  }
}

/**
 * Handles the training logic for a given barrack.
 */
function handleBarrackTraining(barrack, isPlayer) {
  if (!barrack || !barrack.active || barrack.isBuilding || barrack.isTraining) return;
  const spearmanArray = isPlayer ? this.playerSpearmen : this.aiSpearmen; const woodCount = isPlayer ? this.wood : this.aiWood; const side = isPlayer ? 'Player' : 'AI';
  if (spearmanArray.length < SPEARMAN_LIMIT && woodCount >= SPEARMAN_WOOD_COST) {
      barrack.isTraining = true;
      if (isPlayer) { this.wood -= SPEARMAN_WOOD_COST; this.woodText.setText('Wood: ' + this.wood); }
      else { this.aiWood -= SPEARMAN_WOOD_COST; this.aiWoodText.setText('AI Wood: ' + this.aiWood); }
      this.logDebug(`${side} Barrack starts training spearman (${spearmanArray.length + 1}/${SPEARMAN_LIMIT}). Cost: ${SPEARMAN_WOOD_COST}`);
      this.createTrainingText(barrack);
      barrack.trainingTimer = this.time.addEvent({ delay: SPEARMAN_TRAIN_TIME, callback: () => this.spawnSpearman(barrack, isPlayer), callbackScope: this });
  }
}
