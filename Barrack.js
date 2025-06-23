// Represents the Barrack building, which trains units.
class Barrack extends Building {
    constructor(scene, x, y, isPlayer, isUnderConstruction = true) {
        const config = {
            health: BARRACK_HEALTH,
            unitType: 'barrack',
            isPlayer: isPlayer,
            healthBarWidth: BUILDING_HEALTH_BAR_WIDTH,
            healthBarColor: isPlayer ? PLAYER_HEALTH_BAR_COLOR : AI_HEALTH_BAR_COLOR
        };

        super(scene, x, y, 'barrack', config);
        
        // Properties for training units
        this.isTraining = false;
        this.trainingTimer = null;
        this.trainingText = null; // The visual text bubble
        
        // When a worker is building this, it starts in a "placeholder" state.
        this.isUnderConstruction = isUnderConstruction;
        if (this.isUnderConstruction) {
            this.health = 0; // Start with 0 health if being built
            this.setAlpha(0.5);
        }

        this.setInteractive();
    }

    // This update method will be called by the scene, allowing the barrack to think for itself.
    update() {
        if (this.isUnderConstruction || this.isTraining || !this.active) {
            return;
        }
        
        // --- Autonomous Training Logic ---
        const spearmanArray = this.isPlayer ? this.scene.playerSpearmen : this.scene.aiSpearmen;
        const woodStorage = this.isPlayer ? 'wood' : 'aiWood';
        const woodText = this.isPlayer ? 'woodText' : 'aiWoodText';
        
        if (spearmanArray.length < SPEARMAN_LIMIT && this.scene[woodStorage] >= SPEARMAN_WOOD_COST) {
            this.isTraining = true;
            this.scene[woodStorage] -= SPEARMAN_WOOD_COST;
            this.scene[woodText].setText(this.isPlayer ? 'Wood: ' + this.scene.wood : 'AI Wood: ' + this.scene.aiWood);
            
            this.scene.logDebug(`${this.isPlayer ? 'Player' : 'AI'} Barrack starts training spearman.`);
            
            this.createTrainingText();
            
            this.trainingTimer = this.scene.time.addEvent({
                delay: SPEARMAN_TRAIN_TIME,
                callback: () => {
                    // When done, it tells the scene to spawn a spearman at its location.
                    this.scene.spawnSpearman(this, this.isPlayer);
                    this.isTraining = false; // Reset for next training
                },
                callbackScope: this
            });
        }
    }
    
    // Call this when a worker finishes building the structure.
    completeConstruction() {
        this.isUnderConstruction = false;
        this.setAlpha(1.0);
        this.scene.logDebug(`${this.isPlayer ? 'Player' : 'AI'} barrack construction complete!`);
        if (this.isPlayer) {
            this.scene.playerBarrackBuilding = false;
        } else {
            this.scene.aiBarrackBuilding = false;
        }
    }

    // Methods for managing the training text bubble, moved from Visuals.js
    createTrainingText() {
        if (this.trainingText) return;
        this.trainingText = this.scene.add.text(0, 0, '0%', TRAINING_TEXT_STYLE).setOrigin(0.5, 1);
        this.updateTrainingText();
    }

    updateTrainingText() {
        if (!this.isTraining || !this.trainingText || !this.trainingText.active || !this.trainingTimer) {
            this.destroyTrainingText();
            return;
        }
        const yOffset = -this.height - 5 - HEALTH_BAR_HEIGHT - 5;
        this.trainingText.setPosition(this.x, this.y + yOffset);
        this.trainingText.setText(Math.floor(this.trainingTimer.getProgress() * 100) + '%');
        this.trainingText.setDepth(this.depth + 10);
    }
    
    destroyTrainingText() {
        if (this.trainingText) {
            this.trainingText.destroy();
            this.trainingText = null;
        }
    }
    
    // Override die to handle training cancellation
    die(attacker) {
        if (this.isPlayer) {
            this.scene.playerBarrack = null;
        } else {
            this.scene.aiBarrack = null;
        }
        
        if (this.trainingTimer) {
            this.trainingTimer.remove();
        }
        this.destroyTrainingText();

        super.die(attacker);
    }
    
    // Use preUpdate to keep the training text in the correct position
    preUpdate(time, delta) {
        super.preUpdate(time, delta); // This calls the Entity's preUpdate (for health bar)
        if (this.isTraining) {
            this.updateTrainingText();
        }
    }
}
