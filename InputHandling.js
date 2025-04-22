/**
 * Handles clicks on interactive game objects (units, trees, buildings).
 */
function handleObjectClick(pointer, gameObject) {
    if (this.gameOver || !this.gameStarted || !gameObject.active) return;
    this.objectClickedRecently = true;
    const unitType = gameObject.getData('unitType');
    const isPlayerUnit = gameObject.getData('isPlayer');
    this.logDebug(`Clicked ${gameObject.texture?.key || 'unknown object'} (Type: ${unitType}, Player: ${isPlayerUnit})`);

    // --- Player Unit Selection ---
    if (isPlayerUnit) {
        if (unitType === 'worker') {
            if (this.selectedWorker === gameObject) { // Deselect worker
                this.logDebug('Worker deselected.');
                this.selectedWorker.clearTint();
                this.selectedWorker = null;
            } else { // Select worker
                if (this.selectedWorker) this.selectedWorker.clearTint();
                if (this.selectedSpearman) {
                    this.selectedSpearman.clearTint();
                    this.updateSpearmanThoughtBubble(this.selectedSpearman); // Update bubble on deselect
                }
                this.logDebug('Worker selected.');
                gameObject.setTint(0x00ffff); // Cyan tint
                this.selectedWorker = gameObject;
                this.selectedSpearman = null;
            }
        } else if (unitType === 'spearman') {
            if (this.selectedSpearman === gameObject) { // Deselect spearman
                this.logDebug('Spearman deselected.');
                this.selectedSpearman.clearTint();
                this.updateSpearmanThoughtBubble(this.selectedSpearman); // Update bubble on deselect
                this.selectedSpearman = null;
            } else { // Select spearman
                if (this.selectedWorker) this.selectedWorker.clearTint();
                if (this.selectedSpearman) {
                    this.selectedSpearman.clearTint();
                    this.updateSpearmanThoughtBubble(this.selectedSpearman); // Update bubble of previously selected
                }
                this.logDebug('Spearman selected.');
                gameObject.setTint(0x00ffff); // Cyan tint
                this.selectedSpearman = gameObject;
                this.updateSpearmanThoughtBubble(this.selectedSpearman, true); // Update bubble of newly selected (force 'selected' reason)
                this.selectedWorker = null;
            }
        } else { // Clicked player building or other non-selectable player object
            if (this.selectedWorker) { this.selectedWorker.clearTint(); this.selectedWorker = null; this.logDebug('Worker deselected (clicked friendly non-unit).'); }
            if (this.selectedSpearman) {
                this.selectedSpearman.clearTint();
                this.updateSpearmanThoughtBubble(this.selectedSpearman); // Update bubble on deselect
                this.selectedSpearman = null;
                this.logDebug('Spearman deselected (clicked friendly non-unit).');
            }
        }
    }
    // --- Command Issuing ---
    else { // Clicked a non-player object (tree, enemy unit, enemy building)
        if (this.selectedWorker) {
            // Worker commands (chopping trees)
            if (gameObject.texture?.key === 'tree_sheet' && this.trees.contains(gameObject)) {
                const targetTree = gameObject;
                const isPlayerChoppingThis = this.worker.isCutting && this.worker.cuttingTarget === targetTree;
                const isAiChoppingThis = this.aiWorker.isCutting && this.aiWorker.cuttingTarget === targetTree;
                const isPlayerMovingToChopThis = this.worker.moving && this.worker.target === targetTree && this.worker.state === 'moving_to_chop';
                const isAiMovingToChopThis = this.aiWorker.moving && this.aiWorker.target === targetTree && this.aiWorker.state === 'moving_to_chop';
                if (isPlayerChoppingThis || isAiChoppingThis || isPlayerMovingToChopThis || isAiMovingToChopThis) {
                    this.logDebug('Invalid command: Tree is busy or targeted.');
                    targetTree.setTintFill(0xff0000);
                    this.time.delayedCall(250, () => { if (targetTree.active) targetTree.clearTint(); });
                } else {
                    this.logDebug('Commanding worker to chop selected tree.');
                    this.sendWorkerToTree(this.selectedWorker, targetTree);
                    this.selectedWorker.clearTint(); this.selectedWorker = null; // Deselect after command
                }
            } else { // Clicked something else (enemy unit, building, etc.) while worker selected
                this.logDebug('Clicked non-tree object. Deselecting worker.');
                this.selectedWorker.clearTint(); this.selectedWorker = null;
            }
        } else if (this.selectedSpearman) {
            // Spearman commands (attacking enemies)
            if (!isPlayerUnit && (unitType === 'worker' || unitType === 'spearman' || unitType === 'house' || unitType === 'barrack')) {
                const commandedSpearman = this.selectedSpearman; // Store ref before deselecting
                this.logDebug(`Commanding selected spearman to attack ${unitType}.`);
                this.sendSpearmanToAttack(commandedSpearman, gameObject);
                commandedSpearman.goal = 'attack'; // Explicitly set goal to attack on player command
                this.updateSpearmanThoughtBubble(commandedSpearman); // Update bubble
                commandedSpearman.clearTint(); this.selectedSpearman = null; // Deselect after command
            } else { // Clicked something else (tree, etc.) while spearman selected
                this.logDebug('Clicked non-enemy object. Deselecting spearman.');
                 this.updateSpearmanThoughtBubble(this.selectedSpearman); // Update bubble on deselect
                this.selectedSpearman.clearTint(); this.selectedSpearman = null;
            }
        } else {
            this.logDebug('Clicked object, but no player unit selected.');
        }
    }
}


/**
 * Handles clicks on the background (not on an interactive object).
 */
function handleBackgroundClick(pointer) {
    if (this.gameOver || !this.gameStarted) return;
    if (this.objectClickedRecently) { this.objectClickedRecently = false; this.logDebug('BG click ignored (object clicked).'); return; }
    this.logDebug('Pointer down detected.');

    if (!pointer.targetObject) { // Ensure it's truly a background click
        this.logDebug('Clicked background.');
        const targetX = pointer.worldX;
        const targetY = pointer.worldY;
        const clickMarker = this.add.circle(targetX, targetY, 10, 0xff0000, 0.8).setDepth(3000);
        this.tweens.add({ targets: clickMarker, alpha: 0, duration: 1000, ease: 'Power1', onComplete: () => { if(clickMarker.active) clickMarker.destroy(); } });

        if (this.selectedWorker) {
            const workerToMove = this.selectedWorker;
            this.logDebug(`Move command issued to worker (${Math.round(targetX)}, ${Math.round(targetY)})`);
            // Stop current actions
            if (workerToMove.isCutting) this.stopCutting(workerToMove);
            if (workerToMove.isBuilding) this.stopBuilding(workerToMove);
            if (workerToMove.moving) this.tweens.killTweensOf(workerToMove); // Stop previous move tween
            // Issue move command
            this.startUnitMove(workerToMove, targetX, targetY, 'moving_to_idle', 'idle');
            // Deselect
            workerToMove.clearTint(); this.selectedWorker = null;
        } else if (this.selectedSpearman) {
            const spearmanToMove = this.selectedSpearman; // Store ref before deselecting
            this.logDebug(`Move command issued to spearman (${Math.round(targetX)}, ${Math.round(targetY)})`);
            // Stop current actions
            if (spearmanToMove.isAttacking) this.stopAttacking(spearmanToMove);
            if (spearmanToMove.moving) this.tweens.killTweensOf(spearmanToMove); // Stop previous move tween
            // Issue move command
            this.startUnitMove(spearmanToMove, targetX, targetY, 'moving_to_idle', 'idle');
            spearmanToMove.goal = 'idle'; // Player move command overrides goal temporarily
             this.updateSpearmanThoughtBubble(spearmanToMove); // Update bubble
            // Deselect
            spearmanToMove.clearTint(); this.selectedSpearman = null;
        } else {
            this.logDebug('Clicked background (no player unit selected).');
        }
    }
}

/**
 * Changes the game's time scale.
 */
function changeTimeScale(factor) {
  if (this.gameOver || !this.gameStarted || factor <= 0) return;
  this.time.timeScale *= factor;
  this.time.timeScale = Phaser.Math.Clamp(this.time.timeScale, 0.125, 8);
  this.logDebug(`Time scale set to ${this.time.timeScale.toFixed(3)}x`);
}

/**
 * Toggles the visibility of the debug text area.
 */
function toggleDebugDisplay() {
  if (this.debugText) {
      this.debugText.visible = !this.debugText.visible;
      if (this.debugText.visible) {
          this.logDebug(`Debug display toggled ON`);
          this.debugText.setText('Debug Output:\n' + this.debugHistory.join('\n'));
      } else { console.log("DEBUG: Debug display toggled OFF"); }
  }
}