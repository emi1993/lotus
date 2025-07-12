// levels/asura_caves.js
registerMandala('asura_caves', {
    // --- Basic Info ---
    name: 'Mandala 4: The Caves of the Adamantine Guru',
    background: null,
    ambiance: ["D2", "A2", "D3"],

    // --- Access & State ---
    isLocked: () => false, 

    onLoad(Game) {
        // Reset state variables for the puzzle
        Game.state.asura_quest_started = false;
        Game.state.asura_ritual_complete = false;
        Game.state.asura_current_wave = 0;
        Game.state.asura_puzzle_active = false;
        Game.state.asura_binding_animation = false;
        Game.beams = [];
        
        // Ensure all stones are hidden and reset initially
        this.objects.forEach(o => {
            if (o.isRitualStone) {
                o.hidden = true;
                o.isStabilized = false;
                o.stabilizedTimer = 0;
            }
        });
        // Make sure the key characters are visible at the start
        const naga = this.objects.find(o => o.id === 'naga_spirit');
        if(naga) naga.hidden = false;
        const altar = this.objects.find(o => o.id === 'ritual_altar');
        if(altar) altar.hidden = false;
    },

    // --- Assets ---
    assetInit(Game, assets) {
        this.background = assets.charnelBg; // Placeholder background
        this.objects.find(o => o.id === 'naga_spirit').sprite.sheet = assets.demonSheet;
        this.objects.find(o => o.id === 'ritual_altar').sprite.sheet = assets.objectSheet; // Assigning the sprite
    },

    // --- Content ---
    dialogues: {
        level_intro: ["(You enter a vast, silent chamber. A dormant Nāga spirit looms in the distance, but closer, a single, ancient altar glows with a faint light.)", "Guru: (I must first draw upon the power of this place before I can face the spirit.)"],
        altar_interaction: ["(You place your hands on the stone. It hums with concentrated energy, showing you visions of a sacred dagger.)", "Guru: (The Vajrakīlāya. The power to bind and stabilize.)", "(Siddhi Gained: Phurba of Stability. The power is now yours. You feel ready to face the Nāga.)"],
        naga_no_siddhi: ["(You approach the Nāga, but its chaotic energy repels you. You feel unprepared.)", "Guru: (I am not yet ready. I must find a source of power in this cave first.)"],
        naga_encounter: ["Nāga Spirit: YOU HAVE COME. YOU WIELD THE DAGGER OF STABILITY. BUT CAN YOUR FOCUS MASTER TRUE CHAOS?", "Guru: (I will not fight you. I will bring you peace.)", "(The first three ritual stones materialize in the air.)"],
        wave_1_fail: ["(The cage of light shatters under the Nāga's raw power. The first rite was not enough.)", "Guru: (My focus is still too weak. I must try again, and complete the next rite.)"],
        wave_2_fail: ["(The cage holds longer, but the Nāga's rage is immense. It breaks the bonds again.)", "Guru: (Closer. The chaos is weakening, but only a perfect ritual will pacify it.)"],
        level_complete: ["(The complete diamond forms a perfect cage of light. The Nāga thrashes, but its chaotic energy dissolves into a serene glow.)", "Nāga Spirit: (Your focus... is absolute. You have harmonized the chaos. The path is open. The realization of Mahāmudrā is yours.)"]
    },
    
    // --- Logic & Puzzle Hooks ---
    setupWave(Game, waveNumber) {
        Game.state.asura_current_wave = waveNumber;
        Game.state.asura_puzzle_active = false; 

        this.objects.forEach(o => {
            if (o.isRitualStone) {
                o.hidden = (o.wave !== waveNumber);
                o.isStabilized = false;
                o.stabilizedTimer = 0;
            }
        });
    },

    onInteract(Game, objectId) {
        if (objectId === 'ritual_altar') {
            if (!Game.state.siddhis.has("Phurba of Stability")) {
                Game.startDialogue('altar_interaction');
            }
            return;
        }

        if (objectId === 'naga_spirit') {
            if (!Game.state.siddhis.has("Phurba of Stability")) {
                Game.startDialogue('naga_no_siddhi');
            } else if (!Game.state.asura_quest_started) {
                Game.state.asura_quest_started = true;
                Game.startDialogue('naga_encounter');
            }
        }
    },

    onDialogueEnd(Game, dialogueKey) {
        if (dialogueKey === 'altar_interaction') {
            Game.state.siddhis.add("Phurba of Stability");
            Game.updateSiddhiUI();
            Game.showControlsGuide();
            const altar = this.objects.find(o => o.id === 'ritual_altar');
            if(altar) altar.hidden = true;
        } else if (dialogueKey === 'naga_encounter') {
            this.setupWave(Game, 1);
        } else if (dialogueKey === 'wave_1_fail') {
            this.setupWave(Game, 2);
        } else if (dialogueKey === 'wave_2_fail') {
            this.setupWave(Game, 3);
        } else if (dialogueKey === 'level_complete') {
            Game.state.asura_ritual_complete = true;
            Game.showMap();
        }
        Game.state.current = Game.GameState.GAMEPLAY;
    },
    
    onPuzzleStart(Game) {
        if (Game.state.asura_quest_started && !Game.state.asura_ritual_complete) {
            Game.state.asura_puzzle_active = true;
        }
    },

    onUpdate(Game) {
        if (!Game.state.asura_puzzle_active) return;

        this.objects.forEach(o => {
            if (o.isRitualStone && o.isStabilized) {
                o.stabilizedTimer -= 16;
                if (o.stabilizedTimer <= 0) {
                    o.isStabilized = false;
                    Game.playFailureSound();
                }
            }
        });
    },
    
    onPuzzleCheck(Game) {
        if (Game.state.asura_ritual_complete || !Game.state.asura_puzzle_active) return;

        const currentWave = Game.state.asura_current_wave;
        const ritualStonesInWave = this.objects.filter(o => o.isRitualStone && o.wave === currentWave);
        const allStabilized = ritualStonesInWave.every(stone => stone.isStabilized);

        if (allStabilized) {
            Game.state.asura_puzzle_active = false;
            Game.playWaveClearSound();

            const naga = this.objects.find(o => o.id === 'naga_spirit');
            const nagaCenter = { x: naga.x + naga.width / 2, y: naga.y + naga.height / 2 };

            ritualStonesInWave.forEach(stone => {
                Game.beams.push({
                    from: { x: stone.x + stone.width / 2, y: stone.y + stone.height / 2 },
                    to: nagaCenter,
                    alpha: 1.0
                });
            });

            setTimeout(() => {
                Game.beams = []; // Clear beams after the animation
                if (currentWave === 1) {
                    Game.startDialogue('wave_1_fail');
                } else if (currentWave === 2) {
                    Game.startDialogue('wave_2_fail');
                } else if (currentWave === 3) {
                    Game.playSuccessSound();
                    if(naga) naga.hidden = true;
                    Game.startDialogue('level_complete');
                }
            }, 2500); // Wait 2.5 seconds for the binding animation
        }
    },

    // --- Data ---
    objects: [
        { id: 'ritual_altar', x: 150, y: 500, width: 80, height: 150, name: 'Ritual Altar', sprite: { sheet: null, sx: 0, sy: 0, sWidth: 64, sHeight: 160 } },
        { id: 'naga_spirit', x: 450, y: 200, width: 100, height: 120, name: 'Hostile Nāga', sprite: { sheet: null, frameWidth: 80, frameHeight: 100 } },
        
        { id: 's1-1', x: 470, y: 300, width: 40, height: 40, isRitualStone: true, wave: 1, hidden: true },
        { id: 's1-2', x: 250, y: 350, width: 40, height: 40, isRitualStone: true, wave: 1, hidden: true },
        { id: 's1-3', x: 690, y: 350, width: 40, height: 40, isRitualStone: true, wave: 1, hidden: true },

        { id: 's2-1', x: 200, y: 150, width: 35, height: 35, isRitualStone: true, wave: 2, hidden: true },
        { id: 's2-2', x: 120, y: 250, width: 35, height: 35, isRitualStone: true, wave: 2, hidden: true },
        { id: 's2-3', x: 280, y: 250, width: 35, height: 35, isRitualStone: true, wave: 2, hidden: true },
        { id: 's2-4', x: 740, y: 150, width: 35, height: 35, isRitualStone: true, wave: 2, hidden: true },
        { id: 's2-5', x: 660, y: 250, width: 35, height: 35, isRitualStone: true, wave: 2, hidden: true },
        { id: 's2-6', x: 820, y: 250, width: 35, height: 35, isRitualStone: true, wave: 2, hidden: true },
        
        { id: 's3-1', x: 475, y: 50,  width: 30, height: 30, isRitualStone: true, wave: 3, hidden: true },
        { id: 's3-2', x: 475, y: 480, width: 30, height: 30, isRitualStone: true, wave: 3, hidden: true },
        { id: 's3-3', x: 100, y: 265, width: 30, height: 30, isRitualStone: true, wave: 3, hidden: true },
        { id: 's3-4', x: 830, y: 265, width: 30, height: 30, isRitualStone: true, wave: 3, hidden: true },
        { id: 's3-5', x: 282, y: 121, width: 30, height: 30, isRitualStone: true, wave: 3, hidden: true },
        { id: 's3-6', x: 191, y: 193, width: 30, height: 30, isRitualStone: true, wave: 3, hidden: true },
        { id: 's3-7', x: 648, y: 121, width: 30, height: 30, isRitualStone: true, wave: 3, hidden: true },
        { id: 's3-8', x: 739, y: 193, width: 30, height: 30, isRitualStone: true, wave: 3, hidden: true },
        { id: 's3-9',  x: 282, y: 409, width: 30, height: 30, isRitualStone: true, wave: 3, hidden: true },
        { id: 's3-10', x: 191, y: 337, width: 30, height: 30, isRitualStone: true, wave: 3, hidden: true },
        { id: 's3-11', x: 648, y: 409, width: 30, height: 30, isRitualStone: true, wave: 3, hidden: true },
        { id: 's3-12', x: 739, y: 337, width: 30, height: 30, isRitualStone: true, wave: 3, hidden: true },
    ],
});