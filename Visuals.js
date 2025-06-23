/**
 * Creates health bar graphics for a given unit.
 * NOTE: This is now being deprecated in favor of Entity-managed health bars.
 * It's kept for objects that have not yet been converted to the Entity class.
 */
function createHealthBar(unit, barWidth, barColor) {
    if (!unit) return;
    const unitHeight = unit.displayHeight || unit.height || 64;
    const initialYOffset = -unitHeight - 5;
    const x = unit.x; const y = unit.y + initialYOffset;
    if (unit.healthBarBg) unit.healthBarBg.destroy(); if (unit.healthBarFill) unit.healthBarFill.destroy();
    unit.healthBarBg = this.add.rectangle(x, y, barWidth, HEALTH_BAR_HEIGHT, 0x333333).setOrigin(0.5);
    unit.healthBarFill = this.add.rectangle(x - barWidth / 2, y, barWidth, HEALTH_BAR_HEIGHT, barColor).setOrigin(0, 0.5);
    unit.healthBarWidth = barWidth;
    if (unit.healthBarBg) unit.healthBarBg.setDepth(unit.depth + 1); if (unit.healthBarFill) unit.healthBarFill.setDepth(unit.depth + 2);
    this.updateHealthBar(unit);
}

/**
 * Creates a temporary health bar for the tree being cut.
 * DEPRECATED: Trees now manage their own health bars via the Entity class.
 */
// function createTreeHealthBar(tree) { ... }


/**
 * Updates the position and fill of a specific tree's health bar.
 * DEPRECATED: Trees now manage their own health bars via the Entity class.
 */
// function updateTreeHealthBar(tree) { ... }

/**
 * Destroys the health bar associated with a specific tree.
 * DEPRECATED: Trees now manage their own health bars via the Entity class.
 */
// function destroyTreeHealthBar(tree) { ... }


/**
 * Updates the position and fill of a unit's health bar.
 * NOTE: This is now being deprecated in favor of Entity-managed health bars.
 */
function updateHealthBar(unit) {
    if (!unit || !unit.active || !unit.healthBarBg || !unit.healthBarFill || !unit.healthBarBg.active || !unit.healthBarFill.active) { this.destroyHealthBar(unit); return; }
    const barWidth = unit.healthBarWidth; const unitHeight = unit.displayHeight || unit.height || 64;
    const yOffset = -unitHeight - 5; const x = unit.x; const y = unit.y + yOffset;
    unit.healthBarBg.setPosition(x, y); unit.healthBarFill.setPosition(x - barWidth / 2, y);
    const currentHealth = typeof unit.health === 'number' ? unit.health : 0;
    const maxHealth = typeof unit.maxHealth === 'number' && unit.maxHealth > 0 ? unit.maxHealth : 1;
    const fillRatio = Math.max(0, Math.min(1, currentHealth / maxHealth));
    const fillWidth = fillRatio * barWidth; unit.healthBarFill.width = fillWidth;
}

  /**
   * Destroys the health bar associated with any unit/building.
   * NOTE: This is now being deprecated in favor of Entity-managed health bars.
   */
  function destroyHealthBar(unit) {
  if (unit) { if (unit.healthBarBg) { unit.healthBarBg.destroy(); unit.healthBarBg = null; } if (unit.healthBarFill) { unit.healthBarFill.destroy(); unit.healthBarFill = null; } }
  }

  /**
   * Creates a training progress text bubble for a barrack.
   */
  function createTrainingText(barrack) {
  if (!barrack || !barrack.active || barrack.trainingText) return;
  this.logDebug("Creating training text..."); this.destroyTrainingText(barrack);
  barrack.trainingText = this.add.text(0, 0, '0%', TRAINING_TEXT_STYLE).setOrigin(0.5, 1);
  if (!barrack.trainingText) { this.logDebug("ERROR: Failed to create text object!"); return; }
  this.updateTrainingText(barrack); this.logDebug("Training text created.");
  }

  /**
   * Updates the position and content of a barrack's training text bubble.
   */
  function updateTrainingText(barrack) {
  if (!barrack || !barrack.active || !barrack.isTraining || !barrack.trainingText || !barrack.trainingText.active) { this.destroyTrainingText(barrack); return; }
  if (!barrack.trainingTimer) return;
  const text = barrack.trainingText; const unitHeight = barrack.displayHeight || barrack.height || 64;
  const yOffset = -unitHeight - 5 - HEALTH_BAR_HEIGHT - 5; const x = barrack.x; const y = barrack.y + yOffset;
  text.setPosition(x, y); const progress = barrack.trainingTimer.getProgress(); const percent = Math.floor(progress * 100);
  text.setText(percent + '%');
  }

  /**
   * Destroys the training text bubble associated with a barrack.
   */
  function destroyTrainingText(barrack) {
  if (barrack && barrack.trainingText && barrack.trainingText.active) { barrack.trainingText.destroy(); barrack.trainingText = null; }
  }

/**
 * Helper function to update the spearman's thought bubble text.
 * @param {Phaser.GameObjects.Sprite} spearman - The spearman whose bubble needs updating.
 * @param {boolean} [forceSelected=false] - Optional flag to force the 'selected' state text.
 */
function updateSpearmanThoughtBubble(spearman, forceSelected = false) {
    if (!spearman || !spearman.active || !spearman.goalText || !spearman.goalText.active) {
        return; // Don't update if spearman or text is invalid
    }

    let goal = spearman.goal || 'idle';
    let state = spearman.state || 'idle';
    let reason = '';
    let text = '';

    if (forceSelected || this.selectedSpearman === spearman) {
        text = 'Selected';
    } else {
        // Determine reason based on state and goal
        switch (state) {
            case 'attacking':
                const targetType = spearman.attackTarget?.getData('unitType') || 'target';
                reason = `vs ${targetType}`;
                goal = 'attack'; // Force goal display to attack while attacking
                break;
            case 'moving_to_attack':
                const moveTargetType = spearman.target?.getData('unitType') || 'target';
                reason = `-> ${moveTargetType}`;
                goal = 'attack'; // Force goal display to attack while moving to attack
                break;
            case 'moving_to_defend_pos':
                reason = '-> base';
                goal = 'defend'; // Force goal display
                break;
            case 'moving_to_explore':
                reason = 'exploring';
                goal = 'scout'; // Force goal display
                break;
            case 'moving_to_idle':
                reason = 'moving';
                goal = 'move'; // Use 'move' for player-directed move goal
                break;
            case 'idle':
                if (goal === 'attack') reason = 'no target';
                else if (goal === 'defend') reason = 'guarding';
                else if (goal === 'scout') reason = 'scouting'; // If idle but goal is scout
                else reason = 'idle';
                break;
            default:
                reason = state; // Default reason is the state itself if unknown
                break;
        }
        // Construct the text string
        text = `G:${goal} | S:${state}`;
        if (reason && reason !== state) { // Add reason if it's different from state
            text += ` (${reason})`;
        }
    }

    spearman.goalText.setText(text);
}

/**
 * Attached to Sprite/Image prototype. Handles taking damage, visual effects, and death.
 */
const takeDamage = function(amount, attacker) { // 'attacker' is the unit dealing damage
    if (!this.active || this.health <= 0 || !this.scene) return; // Already dead/inactive or scene gone

    const previousHealth = this.health;
    this.health -= amount;
    this.scene.updateHealthBar(this); // Update visual

    // --- Damage Flash Effect ---
    if (this.active) { // Check active status before tinting
        this.setTintFill(DAMAGE_FLASH_TINT); // Apply red tint overlay
        this.scene.time.delayedCall(DAMAGE_FLASH_DURATION, () => {
            if (this.active) { // Check again in case destroyed during delay
                this.clearTint();
            }
        }, [], this);
    }
    // --- End Damage Flash Effect ---

    // --- Show Damage Text ---
    if (amount > 0) {
        const textX = this.x;
        // Position slightly above the health bar (if exists) or the unit top
        const yOffset = (this.healthBarBg ? this.healthBarBg.y - HEALTH_BAR_HEIGHT / 2 : this.y - (this.displayHeight || this.height)) - 10;
        const damageText = this.scene.add.text(textX, yOffset, `-${amount}`, DAMAGE_TEXT_STYLE)
            .setOrigin(0.5)
            .setDepth(5100); // Ensure damage text is above fog

        // Animate the text rising and fading
        this.scene.tweens.add({
            targets: damageText,
            y: damageText.y + DAMAGE_TEXT_Y_RISE, // Move up
            alpha: 0, // Fade out
            duration: DAMAGE_TEXT_DURATION,
            ease: 'Power1', // Simple ease out
            onComplete: () => {
                if (damageText.active) { // Check if text still exists before destroying
                    damageText.destroy();
                }
            }
        });
    }
    // --- End Show Damage Text ---

    // --- Retaliation Logic ---
    // A spearman will always retaliate when attacked, unless it's already attacking the same unit.
    if (this.getData('unitType') === 'spearman' && this.health < previousHealth && attacker && attacker.active && attacker.getData('isPlayer') !== this.getData('isPlayer')) {
        const isAlreadyTargetingAttacker = (this.state === 'attacking' && this.attackTarget === attacker);

        if (!isAlreadyTargetingAttacker) {
            this.scene.logDebug(`${this.getData('isPlayer') ? 'Player' : 'AI'} spearman is retaliating!`);
            
            // Stop whatever it was doing
            if (this.isAttacking) this.scene.stopAttacking(this);
            if (this.moving) this.scene.tweens.killTweensOf(this);
            
            // Immediately attack the new threat
            this.scene.sendSpearmanToAttack(this, attacker);
        }
    }
    // --- End Retaliation Logic ---


    // --- Death Check ---
    if (this.health <= 0) {
        this.health = 0;
        const unitType = this.getData('unitType');
        const isPlayerUnit = this.getData('isPlayer');
        this.scene.logDebug(`${unitType} (${isPlayerUnit ? 'Player' : 'AI'}) destroyed!`);

        // Play death sound
        if (unitType === 'house' || unitType === 'barrack') {
            if (this.scene.buildingFallSound) this.scene.buildingFallSound.play();
        } else {
            if (this.scene.unitDieSound) this.scene.unitDieSound.play();
        }

        // *** NEW: Reset any enemy spearman targeting this dying unit ***
        const potentialAttackers = isPlayerUnit ? this.scene.aiSpearmen : this.scene.playerSpearmen;
        potentialAttackers.forEach(potentialAttacker => {
            if (potentialAttacker && potentialAttacker.active) {
                const wasTargetingThis = (potentialAttacker.attackTarget === this) || (potentialAttacker.state === 'moving_to_attack' && potentialAttacker.target === this);
                if (wasTargetingThis) {
                    const attackerSide = potentialAttacker.getData('isPlayer') ? 'Player' : 'AI';
                    this.scene.logDebug(`${attackerSide} spearman's target (${unitType}) destroyed. Resetting attacker.`);
                    // Stop current actions
                    if (potentialAttacker.isAttacking) this.scene.stopAttacking(potentialAttacker);
                    if (potentialAttacker.moving) this.scene.tweens.killTweensOf(potentialAttacker); // Triggers onStop

                    // Reset state and targets explicitly (onStop might handle state, but be sure)
                    potentialAttacker.state = 'idle';
                    potentialAttacker.moving = false;
                    potentialAttacker.target = null;
                    potentialAttacker.attackTarget = null;

                    // Ensure visual reset if not handled by onStop
                     if (potentialAttacker.active) {
                         potentialAttacker.setTexture('spearman_walk_sheet');
                         potentialAttacker.anims.stop();
                         potentialAttacker.setFrame(0);
                         potentialAttacker.setFlipX(!potentialAttacker.getData('isPlayer'));
                     }

                    // Update thought bubble
                    this.scene.updateSpearmanThoughtBubble(potentialAttacker);
                }
            }
        });
        // *** END NEW: Reset attacker logic ***


        // If the destroyed unit was selected, deselect it
        if (this.scene.selectedWorker === this) this.scene.selectedWorker = null;
        if (this.scene.selectedSpearman === this) this.scene.selectedSpearman = null;

        // Cleanup the dying unit
        this.active = false; // Set inactive immediately
        this.setVisible(false);
        this.scene.destroyHealthBar(this);
        this.disableInteractive();
        // Stop any active timers/actions specifically for this unit type upon death
        if (unitType === 'barrack') {
            if (this.trainingTimer) this.trainingTimer.remove();
            this.scene.destroyTrainingText(this);
            this.isTraining = false;
        } else if (unitType === 'worker') {
            if (this.isCutting) this.scene.stopCutting(this);
            if (this.isBuilding) this.scene.stopBuilding(this);
            if (this.moving) this.scene.tweens.killTweensOf(this);
        } else if (unitType === 'spearman') {
            // Actions stopped by the attacker reset logic above if needed
            // Destroy goal text
            if (this.goalText && this.goalText.active) { this.goalText.destroy(); this.goalText = null; }
        }
        // Check win/loss condition
        this.scene.checkEndCondition();
    }
};
