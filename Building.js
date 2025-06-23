// A base class for all building structures in the game. Extends Entity.
class Building extends Entity {
    constructor(scene, x, y, texture, config) {
        // Call the Entity constructor. Buildings use a single texture frame.
        super(scene, x, y, texture, null, config);
    }

    // Override the die method for building-specific death behavior
    die(attacker) {
        this.scene.logDebug(`${this.unitType} (${this.isPlayer ? 'Player' : 'AI'}) destroyed!`);
        
        // Play the building destruction sound
        if (this.scene.buildingFallSound) {
            this.scene.buildingFallSound.play();
        }
        
        // Check win/loss condition BEFORE the object is removed from the scene
        this.scene.checkEndCondition();

        // Let subclasses do their own cleanup (like setting scene references to null)
        // then destroy the building.
        this.destroy();
    }
}
