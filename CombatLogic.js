/**
 * Spawns a spearman near the specified barrack. Reveals FoW for the owner. Assigns initial goal.
 */
  function spawnSpearman(barrack, isPlayer) {
  if (!barrack || !barrack.active || !barrack.isTraining) { this.logDebug("Spawn cancelled: Barrack invalid or not training."); this.destroyTrainingText(barrack); return; }
  barrack.isTraining = false; barrack.trainingTimer = null; this.destroyTrainingText(barrack);
  const spearmanArray = isPlayer ? this.playerSpearmen : this.aiSpearmen; const side = isPlayer ? 'Player' : 'AI';
  if (spearmanArray.length >= SPEARMAN_LIMIT) { this.logDebug(`Spawn cancelled: ${side} spearman limit reached.`); return; }
  const initialSpawnX = barrack.x + (isPlayer ? 40 : -40); const initialSpawnY = barrack.y;
  let finalSpawnPos = { x: initialSpawnX, y: initialSpawnY }; let needsToMove = false;
  if (this.isPositionOccupied(initialSpawnX, initialSpawnY, null)) { this.logDebug("Spawn point occupied, finding nearby spot..."); finalSpawnPos = this.findNearbyEmptyPosition(initialSpawnX, initialSpawnY, 50, null); if (finalSpawnPos.x !== initialSpawnX || finalSpawnPos.y !== initialSpawnY) needsToMove = true; }

  const spearman = this.add.sprite(finalSpawnPos.x, finalSpawnPos.y, 'spearman_walk_sheet').setOrigin(0.5, 1);
  spearman.health = SPEARMAN_HEALTH; spearman.maxHealth = SPEARMAN_HEALTH; spearman.state = 'idle'; spearman.moving = false; spearman.attackTarget = null; spearman.isAttacking = false; spearman.attackTimer = null;
  spearman.setData('unitType', 'spearman'); spearman.setData('isPlayer', isPlayer); spearman.setFrame(0); spearman.setFlipX(!isPlayer);

  // Assign initial goal
  spearman.goal = (Math.random() < 0.5) ? 'attack' : 'defend';
  this.logDebug(`${side} spearman assigned initial goal: ${spearman.goal}`);

  // *** Create goal text bubble ***
  spearman.goalText = this.add.text(0, 0, '', GOAL_TEXT_STYLE).setOrigin(0.5, 1);
  this.updateSpearmanThoughtBubble(spearman); // Set initial text

  spearmanArray.push(spearman);
  const barColor = isPlayer ? PLAYER_HEALTH_BAR_COLOR : AI_HEALTH_BAR_COLOR; this.createHealthBar(spearman, SPEARMAN_HEALTH_BAR_WIDTH, barColor);
  spearman.setInteractive(); // Make spearman clickable
  this.logDebug(`${side} spearman spawned! (${spearmanArray.length}/${SPEARMAN_LIMIT}) at (${Math.round(finalSpawnPos.x)}, ${Math.round(finalSpawnPos.y)})`);
  // --- Reveal FoW for the new spearman (for its owner) ---
  this.updateVisibilityAround(spearman);
  // --- Handle movement if needed ---
  if (needsToMove) {
      this.logDebug(`Spearman moving from initial spawn (${Math.round(initialSpawnX)}, ${Math.round(initialSpawnY)}) to final (${Math.round(finalSpawnPos.x)}, ${Math.round(finalSpawnPos.y)})`);
      spearman.setPosition(initialSpawnX, initialSpawnY); spearman.state = 'moving'; spearman.moving = true; spearman.anims.play('spearman_walk', true);
      this.updateSpearmanThoughtBubble(spearman); // Update bubble for moving state
      const distance = Phaser.Math.Distance.Between(initialSpawnX, initialSpawnY, finalSpawnPos.x, finalSpawnPos.y); const speed = 80; const duration = (distance / speed) * 1000 || 1;
      if (finalSpawnPos.x < initialSpawnX) spearman.setFlipX(true); else spearman.setFlipX(false);
      this.tweens.add({
          targets: spearman, x: finalSpawnPos.x, y: finalSpawnPos.y, duration: duration, ease: 'Linear',
          onComplete: () => { if (!spearman.active) return; spearman.moving = false; spearman.state = 'idle'; spearman.anims.stop(); spearman.setTexture('spearman_walk_sheet'); spearman.setFrame(0); spearman.setFlipX(!isPlayer); this.logDebug("Spearman finished spawn move."); this.updateSpearmanThoughtBubble(spearman); },
          onStop: () => { if (!spearman.active) return; spearman.moving = false; spearman.state = 'idle'; spearman.anims.stop(); spearman.setTexture('spearman_walk_sheet'); spearman.setFrame(0); spearman.setFlipX(!isPlayer); this.logDebug("Spearman spawn move interrupted."); this.updateSpearmanThoughtBubble(spearman); }
      });
  }
}

// --- COMBAT & GOAL FUNCTIONS ---

/**
 * Finds the closest *visible* active enemy target for a unit, based on the unit's perspective.
 */
function findClosestEnemyTarget(unit) {
  if (!unit || !unit.active) return null;

  const isPlayerUnit = unit.getData('isPlayer'); // Perspective of the searching unit
  let potentialTargets = [];

  // Gather potential targets (enemies of the unit)
  if (isPlayerUnit) { // Player unit looks for AI targets
      if (this.aiWorker && this.aiWorker.active) potentialTargets.push(this.aiWorker);
      if (this.aiBarrack && this.aiBarrack.active) potentialTargets.push(this.aiBarrack);
      if (this.aiHouse && this.aiHouse.active) potentialTargets.push(this.aiHouse);
      potentialTargets = potentialTargets.concat(this.aiSpearmen.filter(s => s.active));
  } else { // AI unit looks for Player targets
      if (this.worker && this.worker.active) potentialTargets.push(this.worker);
      if (this.playerBarrack && this.playerBarrack.active) potentialTargets.push(this.playerBarrack);
      if (this.house && this.house.active) potentialTargets.push(this.house);
      potentialTargets = potentialTargets.concat(this.playerSpearmen.filter(s => s.active));
  }

  if (potentialTargets.length === 0) return null;

  let closestVisibleTarget = null;
  let minDistanceSq = Infinity;

  potentialTargets.forEach(target => {
      // --- Visibility Check (using the *searching unit's* perspective) ---
      const { gridX, gridY } = this.worldToGrid(target.x, target.y);
      if (!this.isCellRevealed(gridX, gridY, isPlayerUnit)) { // Check visibility from the unit's perspective
          return; // Skip this target, it's in the fog for the searching unit
      }
      // --- End Visibility Check ---

      const distanceSq = Phaser.Math.Distance.Squared(unit.x, unit.y, target.x, target.y);
      if (distanceSq < minDistanceSq) {
          minDistanceSq = distanceSq;
          closestVisibleTarget = target;
      }
  });

  return closestVisibleTarget; // Return the closest one that is visible to the searching unit
}

/**
 * Finds the closest active friendly building (House or Barrack) to a unit.
 * @param {Phaser.GameObjects.Sprite} unit - The unit searching for a building.
 * @returns {Phaser.GameObjects.Sprite|Phaser.GameObjects.Image|null} The closest building or null if none found.
 */
function findClosestFriendlyBuilding(unit) {
  if (!unit || !unit.active) return null;
  const isPlayer = unit.getData('isPlayer');
  const buildings = [];
  if (isPlayer) {
      if (this.playerBarrack && this.playerBarrack.active) buildings.push(this.playerBarrack);
      if (this.house && this.house.active) buildings.push(this.house);
  } else {
      if (this.aiBarrack && this.aiBarrack.active) buildings.push(this.aiBarrack);
      if (this.aiHouse && this.aiHouse.active) buildings.push(this.aiHouse);
  }

  if (buildings.length === 0) return null;

  let closestBuilding = null;
  let minDistSq = Infinity;

  buildings.forEach(building => {
      const distSq = Phaser.Math.Distance.Squared(unit.x, unit.y, building.x, building.y);
      if (distSq < minDistSq) {
          minDistSq = distSq;
          closestBuilding = building;
      }
  });
  return closestBuilding;
}


/**
 * Sends a spearman to move within attack range of a target.
 */
function sendSpearmanToAttack(spearman, target) {
  if (!spearman || !spearman.active || !target || !target.active || this.gameOver) { if(spearman && spearman.active) spearman.state = 'idle'; return; }
  const side = spearman.getData('isPlayer') ? 'Player' : 'AI'; this.logDebug(`${side} spearman (Goal: ${spearman.goal}) moving to attack ${target.getData('unitType') || 'target'}.`);
  // Stop current actions before moving to attack
  if (spearman.isAttacking) this.stopAttacking(spearman);
  if (spearman.moving) this.tweens.killTweensOf(spearman); // Stop previous move

  spearman.attackTarget = null; // Clear previous attack target
  spearman.target = target; // Set the new target for movement reference
  spearman.moving = true;
  spearman.state = 'moving_to_attack';
  // Update goal text
  this.updateSpearmanThoughtBubble(spearman);

  const angleToTarget = Phaser.Math.Angle.Between(spearman.x, spearman.y, target.x, target.y);
  // Move slightly closer than max range to ensure attack starts
  const targetX = target.x - Math.cos(angleToTarget) * (SPEARMAN_ATTACK_RANGE - 10);
  const targetY = target.y - Math.sin(angleToTarget) * (SPEARMAN_ATTACK_RANGE - 10);

  this.startUnitMove(spearman, targetX, targetY, 'moving_to_attack', 'attacking'); // Use startUnitMove, transition to 'attacking' state on arrival
  }

/**
 * Starts the attack sequence for a spearman.
 */
function startAttacking(spearman, target) {
  if (!spearman || !spearman.active || !target || !target.active || spearman.isAttacking || this.gameOver) return;
  // Stop movement if any
  if (spearman.moving) {
      this.tweens.killTweensOf(spearman);
      spearman.moving = false;
  }
  const side = spearman.getData('isPlayer') ? 'Player' : 'AI'; this.logDebug(`${side} spearman (Goal: ${spearman.goal}) starting attack on ${target.getData('unitType') || 'target'}.`);
  spearman.state = 'attacking'; spearman.isAttacking = true; spearman.attackTarget = target;
  // Update goal text
  this.updateSpearmanThoughtBubble(spearman);

  if (target.x < spearman.x) spearman.setFlipX(true); else spearman.setFlipX(false);
  spearman.setTexture('spearman_attack_sheet'); spearman.anims.play('spearman_attack', true);
  if (this.spearmanAttackSound && !this.spearmanAttackSound.isPlaying) this.spearmanAttackSound.play({ loop: true });
  // Ensure attack timer doesn't already exist
  if (spearman.attackTimer) spearman.attackTimer.remove(false);
  spearman.attackTimer = this.time.addEvent({ delay: SPEARMAN_ATTACK_DELAY, callback: () => this.damageTarget(spearman), callbackScope: this, loop: true });
  }

/**
 * Stops the attack sequence for a spearman.
 */
function stopAttacking(spearman) {
  if (!spearman || !spearman.isAttacking) return;
  // const side = spearman.getData('isPlayer') ? 'Player' : 'AI'; // No need to log here, logged in start/damage
  if (spearman.attackTimer) { spearman.attackTimer.remove(false); spearman.attackTimer = null; }
  spearman.isAttacking = false; spearman.attackTarget = null;
  if (this.spearmanAttackSound && this.spearmanAttackSound.isPlaying) {
      // Only stop sound if no other spearmen are attacking
      const anyOtherAttacking = [...this.playerSpearmen, ...this.aiSpearmen].some(s => s.active && s !== spearman && s.isAttacking);
      if (!anyOtherAttacking) this.spearmanAttackSound.stop();
  }
  if (spearman.active) { spearman.setTexture('spearman_walk_sheet'); spearman.anims.stop('spearman_attack'); spearman.setFrame(0); spearman.setFlipX(!spearman.getData('isPlayer')); }
}

/**
 * Applies damage to the spearman's current target and triggers attack flash.
 */
function damageTarget(spearman) {
  if (this.gameOver || !spearman || !spearman.active || !spearman.isAttacking || !spearman.attackTarget || !spearman.attackTarget.active) {
      if (spearman && spearman.active && spearman.isAttacking) {
          this.stopAttacking(spearman);
          spearman.state = 'idle';
           // Update goal text
           this.updateSpearmanThoughtBubble(spearman);
      }
      return;
  }

  const target = spearman.attackTarget;
  const side = spearman.getData('isPlayer') ? 'Player' : 'AI';
  const distance = Phaser.Math.Distance.Between(spearman.x, spearman.y, target.x, target.y);

  if (distance > SPEARMAN_ATTACK_RANGE + 5) { // Add a small buffer
      this.logDebug(`${side} spearman (Goal: ${spearman.goal}) target moved out of range. Stopping attack.`);
      this.stopAttacking(spearman);
      spearman.state = 'idle'; // Go idle, will re-evaluate in next update
       // Update goal text
       this.updateSpearmanThoughtBubble(spearman);
      return;
  }

  // --- Create Directed Attack Flash Effect ---
  const angle = Phaser.Math.Angle.Between(spearman.x, spearman.y, target.x, target.y);
  const flashLength = Math.max(MIN_ATTACK_FLASH_LENGTH, distance * ATTACK_FLASH_LENGTH_FACTOR);
  const flashX = spearman.x;
  const flashY = spearman.y - spearman.displayHeight / 3; // Start near center vertically

  // Create the rectangle
  const flash = this.add.rectangle(
      flashX,
      flashY,
      flashLength, // Length based on distance
      ATTACK_FLASH_WIDTH, // Fixed width
      0xffff00 // Yellow color
  );
  flash.setOrigin(0, 0.5); // Set origin to the start of the beam (left center)
  flash.setAngle(Phaser.Math.RadToDeg(angle)); // Rotate to point at target
  flash.setDepth(5500); // Set high fixed depth

  // Animate the flash fading out
  this.tweens.add({
      targets: flash,
      alpha: 0, // Fade out
      duration: ATTACK_FLASH_DURATION, // Use updated duration
      ease: 'Power1',
      onComplete: () => {
          if (flash.active) {
              flash.destroy();
          }
      }
  });
  // --- End Attack Flash Effect ---

  // Apply damage after showing the effect
  target.takeDamage(SPEARMAN_DPS, spearman); // 'takeDamage' is defined in Visuals.js and attached to prototype
}


/**
 * Handles a spearman's state machine logic based on its assigned goal.
 */
function handleSpearmanState(spearman) {
  if (!this.gameStarted || this.gameOver || !spearman || !spearman.active) return;

  // Player control overrides goal temporarily if selected or moving to idle
  if (spearman.getData('isPlayer') && (this.selectedSpearman === spearman || spearman.state === 'moving_to_idle')) {
       if (this.selectedSpearman === spearman) {
           this.updateSpearmanThoughtBubble(spearman, true); // Force 'selected' text
          return; // Don't automate if selected by player
       }
       // If moving to idle, let it finish (handled in startUnitMove onComplete)
       if (spearman.state === 'moving_to_idle') {
           this.updateSpearmanThoughtBubble(spearman); // Update bubble while moving
           return; // Don't interrupt player move command
       }
  }

  const isPlayer = spearman.getData('isPlayer');
  const side = isPlayer ? 'Player' : 'AI';

  // --- Handle Active Attacking State ---
  if (spearman.state === 'attacking') {
      if (!spearman.attackTarget || !spearman.attackTarget.active) {
          this.logDebug(`${side} spearman's target disappeared while attacking. Stopping.`);
          this.stopAttacking(spearman);
          spearman.state = 'idle'; // Will re-evaluate goal next frame
      } else {
          const distance = Phaser.Math.Distance.Between(spearman.x, spearman.y, spearman.attackTarget.x, spearman.attackTarget.y);
          if (distance > SPEARMAN_ATTACK_RANGE + 5) { // Check range again in update
              this.logDebug(`${side} spearman target moved out of range during attack state. Stopping attack.`);
              this.stopAttacking(spearman);
              spearman.state = 'idle'; // Will re-evaluate goal next frame
          } else {
              // Ensure correct animation/facing if still attacking
              if (!spearman.anims.isPlaying || spearman.anims.currentAnim.key !== 'spearman_attack') {
                  spearman.anims.play('spearman_attack', true);
              }
              if (spearman.attackTarget.x < spearman.x) spearman.setFlipX(true); else spearman.setFlipX(false);
          }
      }
      this.updateSpearmanThoughtBubble(spearman); // Update bubble after checks
      if (spearman.state === 'attacking') return; // Don't do other logic if still attacking
  }

  // --- Handle Non-Attacking States (Based on Goal) ---
  if (!spearman.moving && !spearman.isAttacking) {
      // let actionTaken = false; // Flag to prevent multiple actions per frame

      switch (spearman.goal) {
          case 'attack':
              const attackTarget = this.findClosestEnemyTarget(spearman);
              if (attackTarget) {
                  const distance = Phaser.Math.Distance.Between(spearman.x, spearman.y, attackTarget.x, attackTarget.y);
                  if (distance <= SPEARMAN_ATTACK_RANGE) {
                      this.startAttacking(spearman, attackTarget); // Updates text inside
                  } else {
                      this.sendSpearmanToAttack(spearman, attackTarget); // Updates text inside
                  }
                  // actionTaken = true;
              } else {
                  // No visible targets, switch to scout
                  this.logDebug(`${side} spearman (Attack Goal) found no visible targets. Switching to SCOUT goal.`);
                  spearman.goal = 'scout';
              }
              break;

          case 'defend':
              const defendTarget = this.findClosestEnemyTarget(spearman);
              let shouldAttack = false;
              if (defendTarget) {
                  const distToTarget = Phaser.Math.Distance.Squared(spearman.x, spearman.y, defendTarget.x, defendTarget.y);
                  // Check if target is within defense radius
                  if (distToTarget <= SPEARMAN_DEFENSE_RADIUS * SPEARMAN_DEFENSE_RADIUS) {
                      shouldAttack = true;
                  }
              }

              if (shouldAttack) {
                  const distance = Phaser.Math.Distance.Between(spearman.x, spearman.y, defendTarget.x, defendTarget.y);
                  if (distance <= SPEARMAN_ATTACK_RANGE) {
                      this.startAttacking(spearman, defendTarget); // Updates text inside
                  } else {
                      this.sendSpearmanToAttack(spearman, defendTarget); // Updates text inside
                  }
                  // actionTaken = true;
              } else {
                  // No enemies nearby, ensure unit is near a friendly building
                  const friendlyBuilding = this.findClosestFriendlyBuilding(spearman);
                  if (friendlyBuilding) {
                      const distToBaseSq = Phaser.Math.Distance.Squared(spearman.x, spearman.y, friendlyBuilding.x, friendlyBuilding.y);
                      // If too far from the base, move back towards it (slightly offset)
                      if (distToBaseSq > (SPEARMAN_DEFENSE_RADIUS / 2) * (SPEARMAN_DEFENSE_RADIUS / 2)) { // Use half radius as threshold to return
                          const angleToBase = Phaser.Math.Angle.Between(spearman.x, spearman.y, friendlyBuilding.x, friendlyBuilding.y);
                          const returnX = friendlyBuilding.x - Math.cos(angleToBase) * 30; // Stand near building
                          const returnY = friendlyBuilding.y - Math.sin(angleToBase) * 30;
                          this.logDebug(`${side} spearman (Defend Goal) returning to base near ${friendlyBuilding.getData('unitType')}.`);
                          this.startUnitMove(spearman, returnX, returnY, 'moving_to_defend_pos', 'idle');
                          // actionTaken = true;
                      } else {
                          // Already near base and no enemies, stay idle
                          spearman.state = 'idle';
                          spearman.setTexture('spearman_walk_sheet'); spearman.anims.stop(); spearman.setFrame(0); spearman.setFlipX(!isPlayer);
                      }
                  } else {
                       // No buildings left to defend, switch to attack
                       this.logDebug(`${side} spearman (Defend Goal) found no buildings to defend. Switching to ATTACK goal.`);
                       spearman.goal = 'attack';
                  }
              }
              break;

          case 'scout':
              if (this.areAllCellsRevealed(isPlayer)) {
                  // All fog revealed, switch goal
                  spearman.goal = (Math.random() < 0.5) ? 'attack' : 'defend';
                  this.logDebug(`${side} spearman (Scout Goal) finished scouting. Switching to ${spearman.goal} goal.`);
              } else {
                  // Find nearest hidden cell
                  const nearestHidden = this.findNearestHiddenCell(spearman, isPlayer);
                  if (nearestHidden) {
                      this.logDebug(`${side} spearman (Scout Goal) moving to explore hidden cell at (${nearestHidden.gridX}, ${nearestHidden.gridY}).`);
                      const targetX = nearestHidden.gridX * FOG_CELL_SIZE + FOG_CELL_SIZE / 2;
                      const targetY = nearestHidden.gridY * FOG_CELL_SIZE + FOG_CELL_SIZE / 2;
                      this.startUnitMove(spearman, targetX, targetY, 'moving_to_explore', 'idle'); // Move to explore, become idle on arrival to re-evaluate
                      // actionTaken = true;
                  } else {
                      // Should not happen if areAllCellsRevealed is false, but as fallback, switch goal
                      this.logDebug(`${side} spearman (Scout Goal) found no hidden cells but not all revealed? Switching to ATTACK.`);
                      spearman.goal = 'attack';
                  }
              }
              break;

          case 'idle': // Handle case where player move finished, reassign goal
               spearman.goal = (Math.random() < 0.5) ? 'attack' : 'defend';
               this.logDebug(`${side} spearman was idle (likely post-player move), assigning goal: ${spearman.goal}`);
               break;

          default:
              this.logDebug(`Error: Unknown goal '${spearman.goal}' for ${side} spearman. Setting to attack.`);
              spearman.goal = 'attack';
              break;
      }
  }

  // Safety check: If stuck in moving state without flag
  else if ((spearman.state === 'moving_to_attack' || spearman.state === 'moving_to_explore' || spearman.state === 'moving_to_idle' || spearman.state === 'moving_to_defend_pos') && !spearman.moving && !spearman.isAttacking) {
      this.logDebug(`${side} spearman stuck in ${spearman.state} without moving flag. Resetting state to idle.`);
      spearman.state = 'idle';
      spearman.target = null;
      spearman.setTexture('spearman_walk_sheet');
      spearman.anims.stop(); spearman.setFrame(0); spearman.setFlipX(!isPlayer);
  }

  // Update thought bubble AFTER all state/goal logic for the frame
  this.updateSpearmanThoughtBubble(spearman);
}