// levels/mandala-template.js
// Copy this file to create a new level.
// 1. Change 'mandalaX' to a unique ID (e.g., 'sky-realm').
// 2. Fill in all the details below.

registerMandala('mandalaX', {
    // --- Basic Info ---
    name: 'Mandala X: The [Name]',
    background: null, // Will be set by assetInit
    ambiance: ["C3", "G3"], // Background music notes

    // --- Access & State ---
    // Define the condition for this level to be unlocked on the map.
    isLocked: (gameState) => !gameState.demon_defeated, // Example: requires Charnel to be complete

    // Initialize any state needed for this level the first time it's loaded.
    onLoad(gameState) {
        // e.g., if (gameState.mandalaX_quest_started === undefined) {
        //     gameState.mandalaX_quest_started = false;
        // }
    },

    // --- Assets ---
    // Assign the correct background and object sprites from game.js.
    assetInit(assets) {
        // this.background = assets.mandalaXBg; // You'll need to add asset generation in game.js
        // this.objects.find(o => o.id === 'some_object').sprite.sheet = assets.someSheet;
    },

    // --- Content ---
    // Add all dialogues for this level.
    dialogues: {
        some_dialogue: ["Line 1", "Line 2"],
        another_dialogue: ["..."],
    },

    // --- Logic Hooks (Functions called by the game engine) ---
    // Handles what happens when the player interacts with an object.
    onInteract(objectId) {
        // e.g., if (objectId === 'some_npc') { this.startDialogue('some_dialogue'); }
    },

    // Handles quest flags or events after a dialogue finishes.
    onDialogueEnd(dialogueKey) {
        // e.g., if (dialogueKey === 'some_dialogue') { this.state.mandalaX_quest_started = true; }
        
        // Default behavior: return to gameplay.
        // If a dialogue should lead to another event (like showing the map), handle it here.
        this.state.current = this.GameState.GAMEPLAY;
    },

    // Optional: if this level has a rhythm game.
    onRhythmSuccess() {
        // console.log("Rhythm game won in Mandala X!");
    },

    // Optional: if this level has animated objects.
    onAnimate() {
        // const myObject = this.worlds.mandalaX.objects.find(o => o.id === 'some_object');
        // myObject.sprite.currentFrame = (myObject.sprite.currentFrame + 1) % myObject.sprite.frames;
    },

    // --- Data ---
    // A list of all objects in this level.
    objects: [
        // { id: 'npc', x: 400, y: 410, width: 64, height: 100, name: 'Some NPC', sprite: { ... } },
    ],
});
