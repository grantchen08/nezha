// Represents the main command building, the Town Center (or House).
class TownCenter extends Building {
    constructor(scene, x, y, isPlayer) {
        const config = {
            health: HOUSE_HEALTH,
            unitType: 'house',
            isPlayer: isPlayer,
            healthBarWidth: BUILDING_HEALTH_BAR_WIDTH,
            healthBarColor: isPlayer ? PLAYER_HEALTH_BAR_COLOR : AI_HEALTH_BAR_COLOR
        };

        // Call the parent (Building) constructor
        super(scene, x, y, 'house', config);
        
        // Make it clickable to deselect units
        this.setInteractive();
    }
    
    // Override die for town-center specific death logic
    die(attacker) {
        // Before destroying, update the scene's main reference to this building.
        if (this.isPlayer) {
            this.scene.house = null;
        } else {
            this.scene.aiHouse = null;
        }
        
        // Call the parent (Building) die method for common logic (sound, checkEndCondition, destroy)
        super.die(attacker);
    }
}
