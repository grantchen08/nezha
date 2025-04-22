/**
 * Logs a message to the on-screen debug area, maintaining a history.
 * @param {string} message The message to log.
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
    // Stop any existing actions ONLY IF initiating a new move (not continuing one)
    if (!unit.moving) {
        if (unit.isCutting) this.stopCutting(unit);
        if (unit.isBuilding) this.stopBuilding(unit);
        if (unit.isAttacking) this.stopAttacking(unit);
    }
    // If already moving, kill the old tween before starting a new one
    if (unit.moving) {
        this.tweens.killTweensOf(unit);
    }


    if (!unit || !unit.active) return; // Check if unit is still valid

    const unitType = unit.getData('unitType');
    const side = unit.getData('isPlayer') ? 'Player' : 'AI';
    unit.state = movingState; // Set the specified moving state
    unit.moving = true;
    // unit.target is set specifically for move-to-chop/build/attack, not general move
    if (movingState !== 'moving_to_chop' && movingState !== 'moving_to_build' && movingState !== 'moving_to_attack') {
        unit.target = null;
    }
     // Clear attack target unless specifically moving to attack
    if (movingState !== 'moving_to_attack') {
        unit.attackTarget = null;
    }
    // Update bubble when starting move
    if (unitType === 'spearman') this.updateSpearmanThoughtBubble(unit);


    // Clamp target to game bounds (just in case)
    targetX = Phaser.Math.Clamp(targetX, 0, this.sys.game.config.width);
    targetY = Phaser.Math.Clamp(targetY, 0, this.sys.game.config.height);

    this.logDebug(`${side} ${unitType} moving to (${Math.round(targetX)}, ${Math.round(targetY)}). State: ${movingState} -> ${arrivalState}`);

    const speed = (unitType === 'worker') ? 100 : 80; // Workers move faster
    const distance = Phaser.Math.Distance.Between(unit.x, unit.y, targetX, targetY);
    // Prevent zero duration tweens
    const moveDuration = (distance > 1) ? (distance / speed) * 1000 : 1;
    const animKey = (unitType === 'worker') ? 'worker_walk' : 'spearman_walk';

    unit.anims.play(animKey, true);
    if (targetX < unit.x) unit.setFlipX(true); else unit.setFlipX(false);

    // Start walk sound if needed (checking other units)
    if (this.workerWalkSound && !this.workerWalkSound.isPlaying) {
        let pWorkerMoving = this.worker && this.worker.active && this.worker.moving && this.worker !== unit;
        let aWorkerMoving = this.aiWorker && this.aiWorker.active && this.aiWorker.moving && this.aiWorker !== unit;
        let otherSpearmanMoving = this.playerSpearmen.some(s => s.active && s !== unit && s.moving) || this.aiSpearmen.some(s => s.active && s !== unit && s.moving);
        if (!pWorkerMoving && !aWorkerMoving && !otherSpearmanMoving) this.workerWalkSound.play({ loop: true });
    }

    // Store the original target coordinates for collision check
    const originalTargetX = targetX;
    const originalTargetY = targetY;

    this.tweens.add({
        targets: unit,
        x: targetX,
        y: targetY,
        duration: moveDuration,
        ease: 'Linear',
        onComplete: () => {
            if (!unit.active) return; // Skip if unit destroyed during move

            // Check if state changed mid-tween (e.g., player command)
            if (unit.state !== movingState) {
                 this.logDebug(`${side} ${unitType} move interrupted or state changed during tween. Current state: ${unit.state}`);
                 unit.moving = false; // Ensure moving flag is cleared
                 // State already changed, just update bubble
                 if (unitType === 'spearman') this.updateSpearmanThoughtBubble(unit);
                 return;
            }

            unit.moving = false;

            // --- Arrival Collision Avoidance ---
            let finalX = originalTargetX;
            let finalY = originalTargetY;
            if (this.isPositionOccupied(originalTargetX, originalTargetY, unit)) {
                this.logDebug(`${side} ${unitType} destination (${Math.round(originalTargetX)}, ${Math.round(originalTargetY)}) occupied. Finding nearby spot.`);
                const nearbyPos = this.findNearbyEmptyPosition(originalTargetX, originalTargetY, 50, unit);
                finalX = nearbyPos.x;
                finalY = nearbyPos.y;
                // Update unit position immediately to the adjusted spot
                unit.setPosition(finalX, finalY);
                this.logDebug(`${side} ${unitType} moved to adjusted position (${Math.round(finalX)}, ${Math.round(finalY)}).`);
            } else {
                // Ensure unit is exactly at the target if no collision
                unit.setPosition(finalX, finalY);
            }
            // --- End Arrival Collision Avoidance ---


            // --- Handle Arrival State ---
            if (arrivalState === 'attacking' && unit.target && unit.target.active) {
                // Check range before starting attack (using the potentially adjusted final position)
                const finalDistance = Phaser.Math.Distance.Between(unit.x, unit.y, unit.target.x, unit.target.y);
                if (finalDistance <= SPEARMAN_ATTACK_RANGE) {
                    this.logDebug(`${side} ${unitType} finished move, starting attack.`);
                    this.startAttacking(unit, unit.target); // Updates state and bubble inside
                } else {
                    this.logDebug(`${side} ${unitType} finished move, but target out of range (${finalDistance.toFixed(0)} > ${SPEARMAN_ATTACK_RANGE}). Going idle.`);
                    unit.state = 'idle'; // Target moved away, go idle
                    unit.anims.stop();
                    unit.setTexture(unitType === 'worker' ? 'worker_sheet' : 'spearman_walk_sheet');
                    unit.setFrame(0);
                    unit.setFlipX(unitType === 'spearman' ? !unit.getData('isPlayer') : false);
                }
            } else {
                // Default arrival state (usually 'idle')
                unit.state = arrivalState;
                unit.anims.stop();
                unit.setTexture(unitType === 'worker' ? 'worker_sheet' : 'spearman_walk_sheet');
                unit.setFrame(0);
                unit.setFlipX(unitType === 'spearman' ? !unit.getData('isPlayer') : false);
                this.logDebug(`${side} ${unitType} finished move, now ${arrivalState}.`);
            }
            // Clear move target only if not immediately attacking
            if (unit.state !== 'attacking') {
                 unit.target = null;
            }

            // Update bubble on arrival
            if (unitType === 'spearman') this.updateSpearmanThoughtBubble(unit);

            // Stop walk sound if needed
            if (this.workerWalkSound && this.workerWalkSound.isPlaying) {
                let pWorkerMoving = this.worker && this.worker.active && this.worker.moving;
                let aWorkerMoving = this.aiWorker && this.aiWorker.active && this.aiWorker.moving;
                let otherSpearmanMoving = this.playerSpearmen.some(s => s.active && s.moving) || this.aiSpearmen.some(s => s.active && s.moving);
                if (!pWorkerMoving && !aWorkerMoving && !otherSpearmanMoving) this.workerWalkSound.stop();
            }
        },
        onStop: () => { // Called when tween is killed (e.g., new command issued)
            if (!unit.active) return;
            const wasMoving = unit.moving;
            unit.moving = false; // Ensure flag is cleared
            // Don't reset state if it was changed by the interrupting action (e.g. startAttacking)
            if (unit.state === movingState) {
                unit.state = 'idle'; // Default to idle if interrupted without a new state assigned
                unit.anims.stop();
                unit.setTexture(unitType === 'worker' ? 'worker_sheet' : 'spearman_walk_sheet');
                unit.setFrame(0);
                unit.setFlipX(unitType === 'spearman' ? !unit.getData('isPlayer') : false);
                this.logDebug(`${side} ${unitType} move (${movingState}) interrupted, going idle.`);
            }
            // Update goal text on move stop
             if (unitType === 'spearman') this.updateSpearmanThoughtBubble(unit);

            // Stop walk sound if needed
            if (this.workerWalkSound && this.workerWalkSound.isPlaying && wasMoving) {
                let pWorkerMoving = this.worker && this.worker.active && this.worker.moving;
                let aWorkerMoving = this.aiWorker && this.aiWorker.active && this.aiWorker.moving;
                let otherSpearmanMoving = this.playerSpearmen.some(s => s.active && s.moving) || this.aiSpearmen.some(s => s.active && s.moving);
                if (!pWorkerMoving && !aWorkerMoving && !otherSpearmanMoving) this.workerWalkSound.stop();
            }
        }
    });
}