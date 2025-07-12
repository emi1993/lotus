// levels/palace.js
registerMandala('palace', {
    // --- Basic Info ---
    name: 'Mandala 1: The Palace',
    background: null,
    ambiance: ["C2", "G2"],

    // --- Access & State ---
    isLocked: () => false, 
    
    onLoad(Game) {
        if (Game.state.palace_quest_started === undefined) {
            Game.state.palace_quest_started = false;
            Game.state.palace_insights = new Set();
            Game.state.palace_transgression_complete = false; 
            Game.state.palace_quest_complete = false;
        }
    },

    // --- Assets ---
    assetInit(Game, assets) {
        this.background = assets.palaceBg;
        this.objects.find(o => o.id === 'king').sprite.sheet = assets.kingSheet;
        this.objects.find(o => o.id === 'minister').sprite.sheet = assets.kingSheet; 
        this.objects.find(o => o.id === 'son').sprite.sheet = assets.sonSheet;
        this.objects.find(o => o.id === 'statue').sprite.sheet = assets.objectSheet;
        this.objects.find(o => o.id === 'tapestry').sprite.sheet = assets.objectSheet;
        this.objects.find(o => o.id === 'chest').sprite.sheet = assets.objectSheet;
        this.objects.find(o => o.id === 'guard1').sprite.sheet = assets.guardSheet;
        this.objects.find(o => o.id === 'guard2').sprite.sheet = assets.guardSheet;
    },

    // --- Content ---
    dialogues: {
        king_intro: ["King: Young one, born of the lotus... you are destined to be my heir.", "Guru: (My path lies beyond these palace walls.)", "King: This kingdom is vast, powerful. Why do you look upon it with such melancholy?", "King: Show me you understand the nature of this realm, and perhaps I will understand your path.", "(Quest: Gain insight into the Kingdom's true nature.)"],
        king_during_quest: ["King: The world is at your feet. What truths do you seek?"],
        king_insights_done: ["Guru: I have looked upon your kingdom, great king.", "Guru: Your statue is but bone, your tapestry is woven with sorrow, and your gold is a beautiful cage.", "King: ...I see. A profound sadness... and truth. The world's illusions do not bind you.", "King: I understand now why you must leave. But my court will not. My chief minister holds great influence. Convince him, and your path is clear."],
        king_complete: ["King: You have liberated the minister's son from a dark fate, but in doing so, have invited the court's condemnation. You are now formally exiled.", "King: Go, then. Follow your true path. My heart is heavy, but my eyes are open.", "(Mandala 2: The Charnel Grounds unlocked)"],
        statue: ["(Vajra Gaze): You see past the stone, to the skeleton within. A monument to impermanence.", "(Insight gained: The King's form is transient.)"],
        tapestry: ["(Vajra Gaze): You see the threads of violence and suffering woven into the glorious image.", "(Insight gained: The Kingdom's glory is built on sorrow.)"],
        chest: ["(Vajra Gaze): You see not wealth, but the heavy chains of greed and attachment.", "(Insight gained: The Kingdom's wealth is a prison.)"],
        minister_before_insights: ["Minister: The king is sentimental. I see only a strange child who disrupts the order of this court."],
        minister_after_insights: ["Minister: So, the boy oracle has seen the 'truth.' Your parlour tricks mean nothing.", "Minister: See my son? He is being groomed for true power. He will not be swayed by your strange melancholy. Stay away from him."],
        son_transgression: ["(You approach the minister's son. He stands silent and proud, but your Vajra Gaze sees the truth.)", "(Vajra Gaze): You see not a future leader, but a soul consumed by his father's demonic pride.", "Guru: (To leave him on this path is a cruelty. He must be freed.)", "(With a gesture of compassionate wrath, you perform a ritual. The demonic influence is shattered, leaving the boy bewildered but free.)", "Minister: What have you done to my son?! You have ruined him! Guards! Seize this heretic!"]
    },

    // --- Logic Hooks ---
    onInteract(Game, objectId) {
        if (Game.state.palace_quest_complete) return;
        const insightsGained = Game.state.palace_insights.size === 3;

        switch (objectId) {
            case 'king':
                if (Game.state.palace_transgression_complete) {
                } else if (insightsGained) { 
                    Game.startDialogue('king_insights_done'); 
                } else if (Game.state.palace_quest_started) { 
                    Game.startDialogue('king_during_quest'); 
                } else { 
                    Game.startDialogue('king_intro'); 
                }
                break;
            case 'minister':
                 if (insightsGained) { 
                     Game.startDialogue('minister_after_insights'); 
                 } else { 
                     Game.startDialogue('minister_before_insights'); 
                 }
                break;
            case 'son':
                if (insightsGained && !Game.state.palace_transgression_complete) { 
                    Game.startDialogue('son_transgression'); 
                }
                break;
            case 'statue':
                if (Game.state.palace_quest_started && !Game.state.palace_insights.has("statue")) { Game.state.palace_insights.add("statue"); Game.startDialogue('statue'); }
                break;
            case 'tapestry':
                if (Game.state.palace_quest_started && !Game.state.palace_insights.has("tapestry")) { Game.state.palace_insights.add("tapestry"); Game.startDialogue('tapestry'); }
                break;
            case 'chest':
                if (Game.state.palace_quest_started && !Game.state.palace_insights.has("chest")) { Game.state.palace_insights.add("chest"); Game.startDialogue('chest'); }
                break;
        }
    },

    onDialogueEnd(Game, dialogueKey) {
        if (dialogueKey === 'king_intro') {
            Game.state.palace_quest_started = true;
            Game.state.current = Game.GameState.GAMEPLAY;
            return;
        }
        
        if (dialogueKey === 'son_transgression') {
            Game.state.palace_transgression_complete = true;
            
            const cutsceneSequence = [
                { type: 'call_function', func: (game, world) => {
                    world.objects.find(o => o.id === 'guard1').hidden = false;
                    world.objects.find(o => o.id === 'guard2').hidden = false;
                }},
                { type: 'move', objectId: 'guard1', targetX: Game.player.x - 50, targetY: Game.player.y + 5, speed: 2 },
                { type: 'move', objectId: 'guard2', targetX: Game.player.x + Game.player.width + 2, targetY: Game.player.y + 5, speed: 2 },
                { type: 'wait', duration: 500 },
                { type: 'text', line: "The minister's accusation rings through the court.", duration: 2500 },
                { type: 'text', line: "Summoned before the king, your fate is decided.", duration: 2500 },
                { type: 'text', line: "Exile.", duration: 2000 },
                { type: 'fade', direction: 'out' },
                { type: 'call_function', func: (game, world) => {
                    game.player.x = 780; 
                    world.objects.find(o => o.id === 'guard1').hidden = true;
                    world.objects.find(o => o.id === 'guard2').hidden = true;
                }},
                { type: 'fade', direction: 'in' },
                { type: 'call_function', func: (game, world) => {
                    game.startDialogue('king_complete');
                }}
            ];
            
            Game.startCutscene(cutsceneSequence);
            return;
        }
        if (dialogueKey === 'king_complete') {
            Game.state.palace_quest_complete = true;
            Game.showMap();
            return;
        }
        Game.state.current = Game.GameState.GAMEPLAY;
    },
    
    onAnimate(Game) {
        const animatedRoyal = this.objects.filter(o => o.id === 'king' || o.id === 'minister');
        animatedRoyal.forEach(obj => {
            if (obj && obj.sprite) {
                 obj.sprite.currentFrame = (Game.frameCount % (Game.animationSpeed * 4) < (Game.animationSpeed * 2)) ? 0 : 1;
            }
        });
    },

    // --- Data ---
    objects: [
        { id: 'king', x: 840, y: 550, width: 64, height: 100, name: 'King Indrabhuti', sprite: { sheet: null, frameWidth: 64, frameHeight: 100, frames: 2, y: 0, currentFrame: 0 } },
        { id: 'minister', x: 550, y: 560, width: 60, height: 95, name: 'Demonic Minister', sprite: { sheet: null, frameWidth: 64, frameHeight: 100, frames: 2, y: 0, currentFrame: 0 } },
        { id: 'son', x: 650, y: 545, width: 48, height: 80, name: "Minister's Son", sprite: { sheet: null, frameWidth: 48, frameHeight: 80, y: 0, frames: 1, currentFrame: 0 } },
        { id: 'chest', x: 720, y: 590, width: 80, height: 50, name: 'Chest of Gold', sprite: { sheet: null, sx: 64, sy: 100, sWidth: 80, sHeight: 50 } },
        { id: 'statue', x: 250, y: 380, width: 64, height: 160, name: 'Statue of the King', sprite: { sheet: null, sx: 0, sy: 0, sWidth: 64, sHeight: 160 } },
        { id: 'tapestry', x: 405, y: 220, width: 150, height: 100, name: 'Tapestry of Conquest', sprite: { sheet: null, sx: 64, sy: 0, sWidth: 150, sHeight: 100 } },
        { id: 'guard1', x: -50, y: 560, width: 48, height: 90, name: 'Guard', hidden: true, hideName: true, sprite: { sheet: null, frameWidth: 48, frameHeight: 90, frames: 1, y: 0, currentFrame: 0 } },
        { id: 'guard2', x: 1010, y: 560, width: 48, height: 90, name: 'Guard', hidden: true, hideName: true, sprite: { sheet: null, frameWidth: 48, frameHeight: 90, frames: 1, y: 0, currentFrame: 0 } }
    ],
});