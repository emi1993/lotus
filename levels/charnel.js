// levels/charnel.js
registerMandala('charnel', {
    // --- Basic Info ---
    name: 'Mandala 2: The Charnel Grounds',
    background: null,
    ambiance: ["A1", "E2"],

    // --- Access & State ---
    isLocked: () => false, // Always unlocked for testing

    onLoad(Game) {
        if (Game.state.charnel_quest_started === undefined) {
            Game.state.charnel_quest_started = true; // Start quest immediately on load
            Game.state.demon_defeated = false;
            Game.state.pacified_spirits = new Set();
            Game.state.active_spirit_challenge = null; // Track which spirit is being challenged
        }
        // Reset object visibility on load
        this.objects.forEach(o => {
             if (o.id.startsWith('spirit')) {
                 o.hidden = !Game.state.pacified_spirits.has(o.id);
             }
        });
        this.objects.find(o => o.id === 'demon').hidden = true;
    },

    // --- Assets ---
    assetInit(Game, assets) {
        this.background = assets.charnelBg;
        this.objects.find(o => o.id === 'demon').sprite.sheet = assets.demonSheet;
        this.objects.find(o => o.id === 'spirit1').sprite.sheet = assets.sonSheet;
        this.objects.find(o => o.id === 'spirit2').sprite.sheet = assets.sonSheet;
        this.objects.find(o => o.id === 'spirit3').sprite.sheet = assets.sonSheet;
    },

    // --- Content ---
    dialogues: {
        level_intro: ["(The air is thick with the stench of decay and sorrow.)", "Guru: (The spirits here are bound by fear. I must face them not with force, but with the Mantra of Pacification.)"],
        demon_intro: ["(With the tormented spirits now at peace, their residual fear coalesces into a single, great form.)", "Inner Demon: I AM THE ACCUMULATED FEAR. THE ECHO OF ALL ENDINGS. YOU CANNOT SILENCE ME.", "Guru: (I will not silence you. I will give you peace.)"],
        demon_outro: ["(The demon's form softens, its chaotic energy returning to the quiet earth.)", "(Siddhi Gained: Mantra of Pacification. You can now soothe hostile spirits with rhythmic sound.)"],
        
        spirit_challenge: ["(Your Vajra Gaze reveals a tormented spirit, writhing in silent anguish.)", "Guru: (It is trapped in its own suffering. I must perform the mantra.)"],
        spirit_pacified: ["(The spirit's form shimmers, its anguish replaced by a profound stillness before it dissolves completely.)", "(It is at peace.)"],
        demon_too_early: ["(A great and terrible fear emanates from this spot, but its form is not yet coherent.)", "Guru: (There are other, lesser fears that must be pacified first.)"]
    },

    // --- Logic Hooks ---
    onInteract(Game, objectId) {
        if (objectId.startsWith('spirit')) {
            Game.state.active_spirit_challenge = objectId;
            Game.startDialogue('spirit_challenge');
        } else if (objectId === 'demon') {
            if (Game.state.pacified_spirits.size === 3 && !Game.state.demon_defeated) {
                 Game.startDialogue('demon_intro');
            } else {
                Game.startDialogue('demon_too_early');
            }
        }
    },

    onDialogueEnd(Game, dialogueKey) {
        if (dialogueKey === 'spirit_challenge') {
            Game.startRhythmGame(['o', 'm', 'a', 'h']);
            return;
        }
        
        if (dialogueKey === 'spirit_pacified') {
             // After pacifying a spirit, check if all 3 are done
            if (Game.state.pacified_spirits.size === 3) {
                 const cutscene = [
                    { type: 'text', line: "The air grows heavy. The individual fears have been calmed...", duration: 3000 },
                    { type: 'text', line: "...but their source now reveals itself.", duration: 3000 },
                    { type: 'call_function', func: (game, world) => {
                        const demon = world.objects.find(o => o.id === 'demon');
                        demon.hidden = false;
                        game.playSound("C3");
                    }}
                 ];
                 Game.startCutscene(cutscene);
                 return;
            }
        }

        if (dialogueKey === 'demon_intro') {
            Game.startRhythmGame(['o', 'm', 'a', 'h']);
        } else if (dialogueKey === 'demon_outro') {
            Game.showMap();
        } else {
            Game.state.current = Game.GameState.GAMEPLAY;
        }
    },
    
    onRhythmSuccess(Game) {
        // Check if we were challenging the main demon or a spirit
        if (Game.state.active_spirit_challenge) {
            const spiritId = Game.state.active_spirit_challenge;
            Game.state.pacified_spirits.add(spiritId);
            
            const spiritObject = this.objects.find(o => o.id === spiritId);
            if(spiritObject) spiritObject.hidden = true; // Make the spirit disappear
            
            Game.state.active_spirit_challenge = null;
            Game.startDialogue('spirit_pacified');

        } else { // This was the final demon
            Game.state.demon_defeated = true;
            Game.state.siddhis.add("Mantra of Pacification");
            Game.updateSiddhiUI();
            const demon = this.objects.find(o => o.id === 'demon');
            if(demon) demon.hidden = true;
            Game.startDialogue('demon_outro');
        }
    },
    
    onAnimate(Game) {
        // This function now handles revealing the spirits via "Vajra Gaze" (proximity)
        const player = Game.player;
        const spirits = this.objects.filter(o => o.id.startsWith('spirit'));

        spirits.forEach(spirit => {
            // If the spirit is already pacified, it should remain hidden.
            if (Game.state.pacified_spirits.has(spirit.id)) {
                spirit.hidden = true;
                return;
            }

            const dist = Math.abs((player.x + player.width / 2) - (spirit.x + spirit.width / 2));
            // Reveal the spirit if the player is close enough (the "Vajra Gaze" effect)
            if (dist < 100) {
                if (spirit.hidden) {
                    spirit.hidden = false;
                    Game.playSound("A4"); // Sound cue for reveal
                }
            } else {
                spirit.hidden = true;
            }
        });
    },

    // --- Data ---
    objects: [
        { id: 'demon', x: 750, y: 550, width: 80, height: 100, name: 'Inner Demon', hidden: true, sprite: { sheet: null, frameWidth: 80, frameHeight: 100, frames: 1, y: 0, currentFrame: 0 } },
        
        // Spirits are now hidden by default and have their names shown on reveal
        { id: 'spirit1', x: 200, y: 580, width: 40, height: 70, name: 'Tormented Spirit', hidden: true, sprite: { sheet: null, frameWidth: 48, frameHeight: 80, y: 0, frames: 1, currentFrame: 0 } },
        { id: 'spirit2', x: 500, y: 580, width: 40, height: 70, name: 'Tormented Spirit', hidden: true, sprite: { sheet: null, frameWidth: 48, frameHeight: 80, y: 0, frames: 1, currentFrame: 0 } },
        { id: 'spirit3', x: 850, y: 580, width: 40, height: 70, name: 'Tormented Spirit', hidden: true, sprite: { sheet: null, frameWidth: 48, frameHeight: 80, y: 0, frames: 1, currentFrame: 0 } }
    ],
});