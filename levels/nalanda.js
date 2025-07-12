// levels/nalanda.js
registerMandala('nalanda', {
    // --- Basic Info ---
    name: "Mandala 3: The University of the Lion's Roar",
    background: null,
    ambiance: ["C4", "G4", "D4"],

    // --- Access & State ---
    isLocked: () => false, // Always unlocked for testing. Change to !Game.state.demon_defeated for release.

    onLoad(Game) {
        if (Game.state.nalanda_quest_started === undefined) {
            Game.state.nalanda_quest_started = false;
            Game.state.nalanda_defeated_scholars = new Set();
        }
    },

    // --- Assets ---
    assetInit(Game, assets) {
        this.background = assets.nalandaBg;
        this.objects.find(o => o.id === 'scholar1').sprite.sheet = assets.kingSheet;
        this.objects.find(o => o.id === 'scholar2').sprite.sheet = assets.kingSheet;
        this.objects.find(o => o.id === 'scholar3').sprite.sheet = assets.kingSheet;
    },

    // --- Content ---
    dialogues: {
        level_intro: ["(You arrive at the great university of Nalanda, a vast library of glowing, holographic scrolls.)", "Guru: (To defeat ignorance, one must first master the teachings. But mastery without compassion can become pride.)", "(You see three scholars, their intellectual arrogance a palpable force.)"],
        
        // --- Scholar 1: The Absolutist (Revised Flow) ---
        scholar1_intro: ["Scholar of Permanence: I have contemplated the core of existence and found the ultimate truth!", "Scholar of Permanence: There is an eternal, unchanging self! An Atman! Everything else is merely illusion. Debate me if you dare!", "What is your response?"],
        scholar1_choice: { "1. The self is merely a fleeting illusion.": "s1_fail", "2. If the self is unchanging, how can it experience change?": "s1_win", "3. There is no self, only emptiness.": "s1_fail"},
        s1_win: ["Scholar of Permanence: Wh... If it experiences change, it is not permanent... but if it doesn't experience, it cannot be a self...", "(The scholar's rigid certainty shatters into a thousand pieces. He falls silent, lost in contemplation.)", "(You have defeated the argument of eternalism.)"],
        s1_fail: ["Scholar of Permanence: A simplistic rebuttal! You have not grasped the subtle truth of my logic! Meditate on it and return when you have a real argument."],

        // --- Scholar 2: The Nihilist (Revised Flow) ---
        scholar2_intro: ["Scholar of Nothingness: I have gazed into the void and seen the ultimate truth!", "Scholar of Nothingness: There is NO self! All is chaos, without meaning or consequence! Actions are empty, karma is a lie! Convince me otherwise!", "What is your response?"],
        scholar2_choice: { "1. Actions have consequences, as you can see all around you.": "s2_fail", "2. If all is meaningless, is your statement also meaningless?": "s2_win", "3. The self exists, it is the source of all karma.": "s2_fail"},
        s2_win: ["Scholar of Nothingness: My... my statement? If it is meaningless, it cannot be true... but if it is true, then not everything is meaningless...", "(The scholar is trapped in his own paradox, his cynical view collapsing inward.)", "(You have defeated the argument of nihilism.)"],
        s2_fail: ["Scholar of Nothingness: Bah! The ramblings of a hopeful fool! Your belief in fairy tales does not make them real! Come back when you accept reality!"],

        // --- Scholar 3: The Materialist (Revised Flow) ---
        scholar3_intro: ["Scholar of the Senses: I have observed the world as it is and found the ultimate truth!", "Scholar of the Senses: Only that which can be seen and touched is real! The mind is just a machine of flesh. There is nothing beyond the material!", "What is your response?"],
        scholar3_choice: { "1. The mind can conceive of things the senses cannot perceive.": "s3_fail", "2. Is the 'truth' you have found a physical object to be seen or touched?": "s3_win", "3. You are wrong, the spirit is eternal.": "s3_fail"},
        s3_win: ["Scholar of the Senses: My truth...? Is it... an object? No, it is a concept... a product of the mind... which I claimed was just flesh...", "(The scholar stares at his hands, his entire worldview dissolving.)", "(You have defeated the argument of materialism.)"],
        s3_fail: ["Scholar of the Senses: Metaphysical nonsense! Show me a spirit! Show me a soul! You cannot, because they are not real! Stick to what you can prove!"],

        all_scholars_defeated: ["(With the pride of the scholars pacified, a new clarity dawns in your mind.)", "(You realize that wisdom is not a weapon, but a lens to see the middle way between all extremes.)", "(Siddhi Gained: Dialectical Prism. You can deconstruct flawed arguments to reveal the underlying truth.)"]
    },

    // --- Logic Hooks ---
    onInteract(Game, objectId) {
        if (!Game.state.nalanda_quest_started) {
            Game.startDialogue('level_intro');
            Game.state.nalanda_quest_started = true;
            return;
        }

        if (Game.state.nalanda_defeated_scholars.has(objectId)) return;

        switch (objectId) {
            case 'scholar1': Game.startDialogue('scholar1_intro'); break;
            case 'scholar2': Game.startDialogue('scholar2_intro'); break;
            case 'scholar3': Game.startDialogue('scholar3_intro'); break;
        }
    },

    onDialogueEnd(Game, dialogueKey) {
        if (dialogueKey === 'scholar1_intro') { Game.startDialogue('scholar1_choice'); return; }
        if (dialogueKey === 'scholar2_intro') { Game.startDialogue('scholar2_choice'); return; }
        if (dialogueKey === 'scholar3_intro') { Game.startDialogue('scholar3_choice'); return; }
        
        if (dialogueKey === 's1_win') Game.state.nalanda_defeated_scholars.add('scholar1');
        if (dialogueKey === 's2_win') Game.state.nalanda_defeated_scholars.add('scholar2');
        if (dialogueKey === 's3_win') Game.state.nalanda_defeated_scholars.add('scholar3');

        if (Game.state.nalanda_defeated_scholars.size === 3 && dialogueKey.endsWith('_win')) {
            Game.state.siddhis.add("Dialectical Prism");
            Game.updateSiddhiUI();
            Game.startDialogue('all_scholars_defeated');
            return;
        }

        if (dialogueKey === 'all_scholars_defeated') {
            Game.showMap();
            return;
        }
        
        // Return to gameplay if the dialogue chain is broken (e.g., after a fail)
        Game.state.current = Game.GameState.GAMEPLAY;
    },

    // --- Data ---
    objects: [
        { id: 'scholar1', x: 200, y: 550, width: 64, height: 100, name: 'Scholar of Permanence', sprite: { sheet: null, frameWidth: 64, frameHeight: 100, frames: 2, y: 0, currentFrame: 0 } },
        { id: 'scholar2', x: 450, y: 550, width: 64, height: 100, name: 'Scholar of Nothingness', sprite: { sheet: null, frameWidth: 64, frameHeight: 100, frames: 2, y: 0, currentFrame: 0 } },
        { id: 'scholar3', x: 700, y: 550, width: 64, height: 100, name: 'Scholar of the Senses', sprite: { sheet: null, frameWidth: 64, frameHeight: 100, frames: 2, y: 0, currentFrame: 0 } },
    ],
});