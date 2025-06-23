/**
 * Logs a message to the on-screen debug area, maintaining a history.
 */
function logDebug(message) {
    if (!message) return; // Ignore empty messages
    const time = new Date();
    const timestamp = `${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}`;
    this.debugHistory.push(`[${timestamp}] ${message}`);
    if (this.debugHistory.length > this.maxDebugHistory) {
        this.debugHistory.shift();
    }
    if (this.debugText && this.debugText.visible) {
        this.debugText.setText('Debug Output:\n' + this.debugHistory.join('\n'));
    }
    console.log("DEBUG:", message);
}

/**
 * Checks if a given position is occupied by another unit.
 */
function isPositionOccupied(x, y, excludingUnit = null) {
    const unitsToCheck = [this.worker, this.aiWorker, ...this.playerSpearmen, ...this.aiSpearmen];
    for (const unit of unitsToCheck) {
        if (unit && unit.active && unit !== excludingUnit) {
            const distance = Phaser.Math.Distance.Between(x, y, unit.x, unit.y);
            if (distance < UNIT_COLLISION_RADIUS) return true;
        }
    }
    return false;
}

/**
 * Finds a nearby empty position around a starting point.
 */
function findNearbyEmptyPosition(startX, startY, maxRange = 50, excludingUnit = null) {
    for (let i = 0; i < 10; i++) {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const radius = Phaser.Math.FloatBetween(UNIT_COLLISION_RADIUS, maxRange);
        const checkX = startX + Math.cos(angle) * radius;
        const checkY = startY + Math.sin(angle) * radius;
        if (!this.isPositionOccupied(checkX, checkY, excludingUnit)) {
            return { x: checkX, y: checkY };
        }
    }
    this.logDebug("Could not find nearby empty spot, using original spawn point.");
    return { x: startX, y: startY };
}

/**
 * Initiates a movement tween for a unit towards a specific point.
 * Handles arrival collision avoidance.
 * @param {Phaser.GameObjects.Sprite} unit - The worker or spearman to move.
 * @param {number} targetX - The destination x-coordinate.
 * @param {number} targetY - The destination y-coordinate.
 * @param {string} movingState - The state to set while moving (e.g., 'moving_to_explore').
 * @param {string} arrivalState - The state to set when the destination is reached (e.g., 'idle', 'attacking').
 */
function startUnitMove(unit, targetX, targetY, movingState, arrivalState) {
    if (!unit || !unit.active) return;

    if (unit.moving) {
        this.tweens.killTweensOf(unit);
    }

    const unitType = unit.getData('unitType') || unit.unitType;
    const side = unit.getData('isPlayer') ? 'Player' : 'AI';
    unit.state = movingState;
    unit.moving = true;

    // Do NOT clear the target if the unit is moving to perform a targeted action.
    // The target will be cleared by the action-handling logic itself.
    if (movingState === 'moving_to_idle' || movingState === 'moving_to_explore') {
        unit.target = null;
    }

    if (movingState !== 'moving_to_attack') {
        unit.attackTarget = null;
    }
    
    if (unitType === 'spearman') this.updateSpearmanThoughtBubble(unit);

    targetX = Phaser.Math.Clamp(targetX, 0, this.sys.game.config.width);
    targetY = Phaser.Math.Clamp(targetY, 0, this.sys.game.config.height);

    this.logDebug(`${side} ${unitType} moving to (${Math.round(targetX)}, ${Math.round(targetY)}). State: ${movingState} -> ${arrivalState}`);

    const speed = (unitType === 'worker') ? 100 : 80;
    const distance = Phaser.Math.Distance.Between(unit.x, unit.y, targetX, targetY);
    const moveDuration = (distance > 1) ? (distance / speed) * 1000 : 1;
    const animKey = (unitType === 'worker') ? 'worker_walk' : 'spearman_walk';

    unit.anims.play(animKey, true);
    if (targetX < unit.x) unit.setFlipX(true); else unit.setFlipX(false);

    if (this.workerWalkSound && !this.workerWalkSound.isPlaying) {
        let anyOtherUnitMoving = [this.worker, this.aiWorker, ...this.playerSpearmen, ...this.aiSpearmen].some(u => u && u.active && u !== unit && u.moving);
        if (!anyOtherUnitMoving) this.workerWalkSound.play({ loop: true });
    }
    
    const originalTargetX = targetX;
    const originalTargetY = targetY;

    this.tweens.add({
        targets: unit,
        x: targetX,
        y: targetY,
        duration: moveDuration,
        ease: 'Linear',
        onComplete: () => {
            if (!unit.active) return;
            if (unit.state !== movingState) {
                 this.logDebug(`${side} ${unitType} move interrupted. Current state: ${unit.state}`);
                 unit.moving = false;
                 return;
            }

            unit.moving = false;
            
            unit.setPosition(originalTargetX, originalTargetY);
            
            unit.state = arrivalState;
            this.logDebug(`${side} ${unitType} finished move, now ${arrivalState}.`);

            // If the arrival state is just 'idle', we can safely stop the animation now.
            // For 'init' states, the animation will be handled by the next logic step.
            if (arrivalState === 'idle') {
                unit.anims.stop();
                unit.setTexture(unitType === 'worker' ? 'worker_sheet' : 'spearman_walk_sheet').setFrame(0);
                unit.setFlipX(unitType === 'spearman' ? !unit.getData('isPlayer') : false);
                unit.target = null; // Clear target on idle arrival
            }

            if (unitType === 'spearman') this.updateSpearmanThoughtBubble(unit);

            // Stop walk sound if no other units are moving
            if (this.workerWalkSound && this.workerWalkSound.isPlaying) {
                let anyOtherUnitMoving = [this.worker, this.aiWorker, ...this.playerSpearmen, ...this.aiSpearmen].some(u => u && u.active && u.moving);
                if (!anyOtherUnitMoving) this.workerWalkSound.stop();
            }
        },
        onStop: () => {
            if (!unit.active) return;
            unit.moving = false;
            if (unit.state === movingState) {
                unit.state = 'idle';
                unit.anims.stop();
                unit.setTexture(unitType === 'worker' ? 'worker_sheet' : 'spearman_walk_sheet').setFrame(0);
                this.logDebug(`${side} ${unitType} move (${movingState}) interrupted, going idle.`);
            }
        }
    });
}
