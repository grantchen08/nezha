# Nezha (哪吒) - RTS/Simulation Game [Early Development]

## Introduction

Welcome to the Nezha project! This is an early-stage Real-Time Strategy (RTS) / Simulation game inspired by the ancient Chinese legend of Nezha (哪吒), focusing on the conflict between humans and dragons at Chen Tang Pass (陈塘关).

This project is built using the [Phaser 3](https://phaser.io/) HTML5 game framework.

**Please Note:** This is currently a tech demo showcasing core mechanics like resource gathering, basic combat, and fog of war. It is under active development.

## Play the Demo!

You can play the latest development build live here:

**[https://grantchen08.github.io/nezha/](https://grantchen08.github.io/nezha)**

## Current Demo Features

The current demo includes the following features:

* **Game Engine:** Phaser 3.
* **Core Gameplay:** Resource gathering (wood), unit training, basic combat, Fog of War.
* **Units:**
    * Player/AI Worker (Selectable & Commandable Player Worker)
    * Player/AI Spearman (Trainable combat unit, Selectable & Commandable Player Spearman)
* **Buildings:**
    * Player/AI House (Main structure, game ends if destroyed)
    * Player/AI Barrack (Trains Spearmen, buildable by Worker - AI builds automatically)
* **Resources:** Trees (Choppable with health).
* **Gameplay Mechanics:**
    * **Worker Control:** Select, move, command chop (manual or automatic nearest tree), command build Barrack.
    * **Spearman Control:** Select, move, command attack enemy units/buildings.
    * **Barrack Training:** Workers build barracks. Barracks automatically train Spearmen (up to a limit) if wood is available (AI only for now, requires `startBuildingBarrack` to be triggered for player).
    * **Combat:** Spearmen automatically engage nearby visible enemies based on their current goal (Attack/Defend). They have health, DPS, attack range, and attack delay. Units retaliate when attacked (unless under specific orders like moving).
    * **Spearman AI Goals:**
        * `Attack`: Seek and destroy nearest visible enemy. Switches to `Scout` if no targets visible.
        * `Defend`: Engage enemies within a radius of friendly buildings. Return towards base if idle and far away. Switches to `Attack` if no buildings remain.
        * `Scout`: Move towards the nearest unexplored Fog of War cell. Switches goal when map is explored.
        * `Idle`: Default state, often temporary between actions or after player move command. Will seek a new goal (Attack/Defend).
    * **Resource Collection:** +10 Wood per tree felled. Partial wood awarded if chopping interrupted. Wood used for Barracks and Spearmen.
    * **AI Behavior:** Basic AI worker gathers wood and builds Barracks. AI Spearmen operate based on their goals (Attack/Defend/Scout).
    * **Target Validation:** Clicking a busy tree flashes red.
    * **Collision Avoidance:** Units attempt to find nearby empty spots if their spawn point or destination is occupied.
* **Fog of War (FoW):**
    * Map starts hidden.
    * Visibility is based on player/AI unit and building positions.
    * Separate FoW for Player and AI views.
    * Spearmen use FoW information for scouting and target acquisition.
* **UI & Effects:**
    * Wood count display (Player/AI).
    * Health bars (Workers, Spearmen, Houses, Barracks, Trees being chopped).
    * Training progress (%) text bubble above Barracks.
    * Spearman "Thought Bubble" showing current Goal and State/Action.
    * Walk, Chop, Attack animations.
    * Walk, Chop, Attack, Unit Death, Building Destruction sound effects.
    * Selection tint (cyan) for player units.
    * Move command marker (red circle).
    * Attack flash effect (yellow beam).
    * Damage text (red numbers).
    * Damage flash tint (red) on units/buildings taking damage.
* **Win/Loss/Draw Conditions:**
    * Destroy the enemy House to win.
    * Lose if your House is destroyed.
    * First side to reach 100 wood wins (Legacy condition, may be secondary to House destruction).
    * Draw if all trees are depleted, no side has won via wood, and units/buildings are inactive.
* **Debugging & Controls:**
    * Press 'd' to toggle the on-screen debug log.
    * Press 's' to speed up time (2x, 4x, 8x max).
    * Press 'Shift + s' to slow down time (0.5x, 0.25x, 0.125x min).

## Gameplay Instructions (Current Demo)

1.  Go to the live demo link.
2.  Click the "Click or Tap to Start" overlay.
3.  Player units (Worker, House, Barrack - if built) are on the left; AI is on the right.
4.  Workers will automatically seek trees. AI will build a Barrack and train Spearmen.
5.  **Select Units:** Click your Worker or Spearman. It will be highlighted cyan.
6.  **Command Movement:** While a unit is selected, click empty ground to move there.
7.  **Command Worker Chop:** Select Worker, click a Tree.
8.  **Command Worker Build Barrack:** (Requires triggering `startBuildingBarrack` function manually or via UI button if added) Select Worker, click valid ground location. Costs 50 wood.
9.  **Command Spearman Attack:** Select Spearman, click an enemy Unit or Building.
10. **Deselect:** Click the selected unit again, or click the background/another non-commandable object.
11. **Fog of War:** The map is initially dark. Your units and buildings reveal the area around them. Send Spearmen out (using move commands or their 'Scout' goal) to explore.
12. **Combat:** Spearmen will fight automatically based on their goals, but you can override targets by selecting them and clicking an enemy.
13. **Toggle Debug:** Press 'd'.
14. **Change Speed:** Press 's' (faster) or 'Shift + s' (slower).
15. **Win/Lose:** Destroy the enemy House or have yours destroyed.

## Development Status

This project is progressing through early development. Core RTS mechanics like unit control, resource gathering, Fog of War, and basic combat are now implemented. Focus remains on building the foundational systems before adding more thematic elements.

## Running Locally (for Development)

If you want to run the code locally for development:

1.  Clone the repository.
2.  Because Phaser games often involve loading local assets, you usually cannot run the `index.html` file directly from your filesystem in most modern browsers due to security restrictions (CORS). You need to serve the file using a simple local web server. Here are a few common ways:
    * **Using Python:**
        * Navigate to the project directory in your terminal.
        * If you have Python 3, run: `python -m http.server`
        * If you have Python 2, run: `python -m SimpleHTTPServer`
        * Open your web browser and go to `http://localhost:8000/` (or the port indicated by the command). The server should load `index.html` by default.
    * **Using Node.js:**
        * Make sure you have Node.js installed.
        * Install a simple server package globally (if you haven't already): `npm install -g http-server`
        * Navigate to the project directory in your terminal.
        * Run: `http-server`
        * Open your web browser and go to `http://localhost:8080/` (or the address indicated by the command).
    * **Using VS Code Live Server:**
        * If you use Visual Studio Code, you can install the "Live Server" extension.
        * Right-click the `index.html` file in the VS Code explorer and choose "Open with Live Server".

## Future Plans (High Level)

* Introduce Dragon units and AI.
* Refine combat mechanics (unit types, abilities).
* Develop specific characters (Nezha).
* Expand resource types and building options.
* Integrate elements from the Nezha storyline.
* Improve AI strategies (resource management, attack timing, defense).
* Add player UI for building/training.

## Contributing

Contributions are welcome! As the project is very young, the contribution process is informal for now. Please feel free to fork the repository, make changes, and submit pull requests. Opening issues to discuss potential features or bugs is also encouraged.

## License

Licensed under the **BSD 3-Clause License** - see the LICENSE file for details.
