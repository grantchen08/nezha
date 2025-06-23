// Represents a Worker unit. Extends the base Unit class.
class Worker extends Unit {
    constructor(scene, x, y, isPlayer) {
        const config = {
            health: WORKER_HEALTH,
            speed: 100,
            unitType: 'worker',
            isPlayer: isPlayer,
            healthBarWidth: UNIT_HEALTH_BAR_WIDTH,
            healthBarColor: isPlayer ? PLAYER_HEALTH_BAR_COLOR : AI_HEALTH_BAR_COLOR
        };
        super(scene, x, y, 'worker_sheet', 0, config);

        // Worker-specific properties
        this.isCutting = false;
        this.isBuilding = false;
        this.cuttingTarget = null;
        this.buildingTarget = null;
        this.cuttingTimer = null;
        this.buildingTimer = null;
    }

    // The main update loop for the worker's AI
    update() {
        if (!this.active || this.moving || this.isCutting || this.isBuilding) {
            return;
        }

        // --- State-based Action Initialization ---
        // This runs AFTER a move is complete, if the arrival state was an 'init' state.
        if (this.state === 'chopping_init') {
            this.scene.startChoppingAction(this);
            return;
        }
        if (this.state === 'building_init') {
            this.scene.startBuildingAction(this);
            return;
        }

        // Do not act autonomously if selected by the player
        if (this.scene.selectedWorker === this) {
            return;
        }

        // --- Autonomous Job Seeking ---
        // Priority 1: Build a barrack
        const woodCount = this.isPlayer ? this.scene.wood : this.scene.aiWood;
        const existingBarrack = this.isPlayer ? this.scene.playerBarrack : this.scene.aiBarrack;
        const isBuildingBarrack = this.isPlayer ? this.scene.playerBarrackBuilding : this.scene.aiBarrackBuilding;

        if (!(existingBarrack && existingBarrack.active) && !isBuildingBarrack && woodCount >= BARRACK_WOOD_COST) {
            this.scene.startBuildingBarrack(this, this.isPlayer ? 'player' : 'ai');
            return;
        }

        // Priority 2: Find a tree to chop
        const closestTree = this.scene.findClosestTree(this);
        if (closestTree) {
            this.scene.sendWorkerToTree(this, closestTree);
        } else {
            // Priority 3: Explore
            const nearestHidden = this.scene.findNearestHiddenCell(this, this.isPlayer);
            if (nearestHidden) {
                const targetX = nearestHidden.gridX * FOG_CELL_SIZE + FOG_CELL_SIZE / 2;
                const targetY = nearestHidden.gridY * FOG_CELL_SIZE + FOG_CELL_SIZE / 2;
                this.moveTo(targetX, targetY, 'moving_to_explore', 'idle');
            }
        }
    }
    
    // Override die to make sure timers are cleaned up
    die(attacker) {
        this.stopAllActions();
        super.die(attacker);
    }
    
    // A helper method to stop all current actions and timers.
    stopAllActions() {
        if(this.isCutting) this.scene.stopCutting(this);
        if(this.isBuilding) this.scene.stopBuilding(this);
        if(this.moving) this.scene.tweens.killTweensOf(this);
    }
}
