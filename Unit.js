// A base class for all movable units in the game. Extends Entity.
class Unit extends Entity {
    constructor(scene, x, y, texture, frame, config) {
        super(scene, x, y, texture, frame, config);

        this.state = 'idle'; // e.g., 'idle', 'moving', 'chopping', 'attacking'
        this.moving = false;
        this.target = null;
        this.speed = config.speed || 100; // Default speed
    }

    // This method will contain the unit's core AI and state machine.
    // It will be called by the scene's update loop.
    update() {
        // To be implemented by subclasses like Worker and Spearman
    }

    // A generic move function that units can use.
    // We'll keep the logic in the main scene for now to handle sounds and tweens globally.
    moveTo(targetX, targetY, movingState, arrivalState) {
        this.scene.startUnitMove(this, targetX, targetY, movingState, arrivalState);
    }
    
    // Override the die method for unit-specific death behavior
    die(attacker) {
        // If the unit was selected, deselect it
        if (this.scene.selectedWorker === this) this.scene.selectedWorker = null;
        if (this.scene.selectedSpearman === this) this.scene.selectedSpearman = null;

        // Play the generic unit death sound
        if (this.scene.unitDieSound) {
            this.scene.unitDieSound.play();
        }

        super.die(attacker); // Call the parent (Entity) die method
    }
}
