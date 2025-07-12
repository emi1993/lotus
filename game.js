if (!window.lotusGameInitialized) {
    window.lotusGameInitialized = true;

    const Game = {
        // --- DOM Elements & Context ---
        canvas: null, ctx: null, titleScreen: null, mapScreen: null,
        mapLocations: null, dialogueBox: null, dialogueText: null, siddhiList: null,
        vhsOverlay: null, rhythmContainer: null, controlsGuide: null, loadingPrompt: null,
        frameOverlay: null, cutsceneText: null,

        // --- Game State & Config ---
        GameState: { LOADING: 'LOADING', TITLE: 'TITLE', MAP: 'MAP', GAMEPLAY: 'GAMEPLAY', DIALOGUE: 'DIALOGUE', RHYTHM: 'RHYTHM', CUTSCENE: 'CUTSCENE', AIMING: 'AIMING', ERROR: 'ERROR' },
        state: {
            current: 'LOADING',
            world: null,
            targetableObject: null,
            siddhis: new Set(["Vajra Gaze (Passive)"]),
            fadeAlpha: 0,
            fadeMode: null,
            onFadeComplete: null,
            cutsceneQueue: [],
            isCutsceneEventRunning: false,
        },

        assets: {},
        allAssetsGenerated: false,
        
        // --- Animation & Control ---
        frameCount: 0, animationSpeed: 12,
        keys: { arrowleft: false, arrowright: false, arrowup: false, arrowdown: false, a: false, s: false },
        actionPressed: false,
        
        reticle: { x: 0, y: 0, speed: 7 },

        // --- Player & World Data ---
        player: { x: 100, y: 570, width: 48, height: 80, speed: 4, isMoving: false, sprite: { sheet: null, frameWidth: 48, frameHeight: 80, idle: { frames: 2, y: 0 }, walk: { frames: 2, y: 80 }, currentAnim: 'idle', currentFrame: 0, direction: 1 } },
        worlds: {},
        canvasWidth: 960,
        canvasHeight: 720,
        phurba: {
            active: false,
            x: 0, y: 0,
            vx: 0, vy: 0,
            size: 15,
            speed: 15,
        },
        beams: [], // For drawing the energy beams

        // --- Dialogue & Rhythm Data ---
        dialogue: {
            isActive: false,
            isChoice: false,
            choices: [],
            choiceIndex: 0,
            currentKey: null,
            currentLines: [],
            lineIndex: 0,
            typingTimeout: null,
        },
        rhythmSequence: [],
        playerSequenceIndex: 0,
        
        // =================================================================
        // MODULE: INITIALIZATION
        // =================================================================
        init() {
            this.canvas = document.getElementById('game-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.titleScreen = document.getElementById('title-screen');
            this.mapScreen = document.getElementById('map-screen');
            this.mapLocations = document.getElementById('map-locations');
            this.dialogueBox = document.getElementById('dialogue-box');
            this.dialogueText = document.getElementById('dialogue-text');
            this.siddhiList = document.getElementById('siddhi-list');
            this.vhsOverlay = document.getElementById('vhs-overlay');
            this.rhythmContainer = document.getElementById('rhythm-game-container');
            this.controlsGuide = document.getElementById('controls-guide');
            this.loadingPrompt = document.getElementById('loading-prompt');
            this.frameOverlay = document.getElementById('mandala-frame-overlay');
            this.cutsceneText = document.getElementById('cutscene-text');

            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());

            this.updateSiddhiUI();
            this.gameLoop(); 

            this.loadingPrompt.textContent = 'Generating Dharma...';

            this.generateAllAssets()
                .then(() => {
                    this.loadingPrompt.textContent = 'Initializing Mandalas...';
                    this.initializeAssets();
                    this.setupEventListeners();
                    this.state.current = this.GameState.TITLE;
                    this.loadingPrompt.textContent = 'Click to Begin';
                })
                .catch(error => {
                    console.error("CRITICAL ERROR during initialization:", error);
                    this.state.current = this.GameState.ERROR;
                    this.loadingPrompt.textContent = 'Error during loading.';
                });
        },

        resizeCanvas() {
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = this.canvasWidth * dpr;
            this.canvas.height = this.canvasHeight * dpr;
            this.canvas.style.width = `${this.canvasWidth}px`;
            this.canvas.style.height = `${this.canvasHeight}px`;
            this.ctx.scale(dpr, dpr);
            this.ctx.imageSmoothingEnabled = false;
        },

        initializeAssets() {
            this.player.sprite.sheet = this.assets.playerSheet;
            for (const worldKey in this.worlds) {
                const world = this.worlds[worldKey];
                if (world.assetInit) {
                    world.assetInit(this, this.assets); 
                }
            }
        },

        setupEventListeners() {
            this.titleScreen.addEventListener('click', () => {
                if (this.allAssetsGenerated) {
                    this.titleScreen.style.display = 'none';
                    this.startGame();
                }
            });

            window.addEventListener('keydown', e => {
                const key = e.key.toLowerCase();
                if (this.keys[key] !== undefined) this.keys[key] = true;
                
                if (this.state.current === this.GameState.GAMEPLAY) {
                    if (key === 's' && this.state.siddhis.has("Phurba of Stability") && !this.actionPressed) {
                        this.actionPressed = true;
                        this.state.current = this.GameState.AIMING;
                        this.reticle.x = this.player.x + this.player.width / 2;
                        this.reticle.y = this.player.y + this.player.height / 2;
                    }
                } else if (this.state.current === this.GameState.AIMING) {
                     if (key === 's' && !this.actionPressed) {
                         this.actionPressed = true;
                         this.state.current = this.GameState.GAMEPLAY;
                    }
                    if (key === 'a' && !this.phurba.active && !this.actionPressed) {
                        this.actionPressed = true;
                        this.firePhurba();
                    }
                }
                
                if (this.state.current === this.GameState.DIALOGUE) {
                    if (this.dialogue.isChoice) {
                        if (key === 'arrowup' && !this.actionPressed) { this.actionPressed = true; this.dialogue.choiceIndex = (this.dialogue.choiceIndex - 1 + this.dialogue.choices.length) % this.dialogue.choices.length; this.playSound("C5"); this.renderChoices();}
                        else if (key === 'arrowdown' && !this.actionPressed) { this.actionPressed = true; this.dialogue.choiceIndex = (this.dialogue.choiceIndex + 1) % this.dialogue.choices.length; this.playSound("C5"); this.renderChoices();}
                        else if (key === 'a' && !this.actionPressed) { this.actionPressed = true; this.confirmDialogueChoice(); }
                    } else {
                        if (key === 'a' && !this.actionPressed) { this.actionPressed = true; this.handleDialogueAdvance(); }
                    }
                } else if (this.state.current === this.GameState.RHYTHM) {
                    this.handleRhythmInput(key);
                }
            });

            window.addEventListener('keyup', e => {
                const key = e.key.toLowerCase();
                if (this.keys[key] !== undefined) this.keys[key] = false;
                if (key === 'a' || key === 's' || key === 'arrowup' || key === 'arrowdown') this.actionPressed = false;
            });
        },
        
        startGame() {
            this.setupAudio();
            this.showMap();
        },

        // =================================================================
        // MODULE: ASSET GENERATION
        // =================================================================
        generatePixelArt(generatorFn) { return new Promise((resolve) => { const c = document.createElement('canvas'); const ct = c.getContext('2d'); generatorFn(c, ct); const i = new Image(); i.onload = () => resolve(i); i.src = c.toDataURL(); }); },
        generatePalaceBackground(c, ct) { c.width = this.canvasWidth; c.height = this.canvasHeight; const floorTop = 540; ct.fillStyle = '#282a36'; ct.fillRect(0, 0, c.width, c.height); const fC1 = '#44475a', fC2 = '#3a3c4a', tS = 60; for (let y = 0; y * 25 < c.height - floorTop + 50; y++) { for (let x = -1; x * tS < c.width + tS; x++) { ct.fillStyle = (x + y) % 2 === 0 ? fC1 : fC2; ct.beginPath(); const tY = floorTop + y * 25, bY = floorTop + (y + 1) * 25; ct.moveTo(x * tS + y * 30, tY); ct.lineTo((x + 1) * tS + y * 30, tY); ct.lineTo((x + 1) * tS + (y + 1) * 30, bY); ct.lineTo(x * tS + (y + 1) * 30, bY); ct.closePath(); ct.fill(); } } const wallX = 150, wallY = 100, wallWidth = c.width - 300, wallHeight = 400; const brickW = 80, brickH = 30; ct.fillStyle = '#3a3c4a'; ct.fillRect(wallX, wallY, wallWidth, wallHeight); ct.strokeStyle = '#282a36'; ct.lineWidth = 2; for (let y = 0; y * brickH < wallHeight; y++) { for (let x = 0; x * brickW < wallWidth; x++) { let offsetX = (y % 2 === 0) ? 0 : -brickW / 2; ct.strokeRect(wallX + x * brickW + offsetX, wallY + y * brickH, brickW, brickH); } } function drawWindow(x, y) { const w = 120, h = 180; ct.fillStyle = '#1a0521'; ct.beginPath(); ct.moveTo(x, y + h); ct.lineTo(x, y + 40); ct.arc(x + w / 2, y + 40, w / 2, Math.PI, 0); ct.lineTo(x + w, y + h); ct.closePath(); ct.fill(); ct.fillStyle = 'rgba(241, 250, 140, 0.8)'; ct.beginPath(); ct.arc(x + 85, y + 45, 20, 0, 2 * Math.PI); ct.fill(); for(let i = 0; i < 5; i++) { ct.fillStyle = 'rgba(100, 100, 100, 0.7)'; ct.fillRect(x + 15 + i*20, y + 140, 4, -Math.random()*20-10); } ct.strokeStyle = '#282a36'; ct.lineWidth = 8; ct.stroke(); } drawWindow(220, 180); drawWindow(c.width - 220 - 120, 180); function drawCandle(x, y) { ct.fillStyle = '#6272a4'; ct.fillRect(x - 10, y, 20, 30); ct.fillStyle = '#f8f8f2'; ct.fillRect(x - 6, y - 20, 12, 25); ct.fillStyle = '#ffb86c'; ct.beginPath(); ct.ellipse(x, y - 25, 4, 8, 0, 0, 2 * Math.PI); ct.fill(); } drawCandle(400, 420); drawCandle(c.width - 400, 420); },
        generateCharnelBackground(c, ct) { c.width = this.canvasWidth; c.height = this.canvasHeight; const floorBottom = 650; const sG=ct.createLinearGradient(0,0,0,c.height); sG.addColorStop(0,'#1a0521'); sG.addColorStop(1,'#4b0f3d'); ct.fillStyle=sG; ct.fillRect(0,0,c.width,c.height); ct.fillStyle='rgba(189,147,249,0.5)'; ct.beginPath(); ct.arc(c.width - 150,150,70,0,2*Math.PI); ct.fill(); ct.fillStyle='rgba(40,42,54,0.8)'; ct.fillRect(0,floorBottom,c.width,c.height-floorBottom); for(let i=0;i<35;i++){ ct.fillStyle='rgba(139,233,253,0.3)'; ct.fillRect(Math.random()*c.width,floorBottom,Math.random()*6+2, -Math.random()*150-30); ct.fillStyle='rgba(100,100,100,0.5)'; ct.fillRect(Math.random()*c.width,400+Math.random()*240,25+Math.random()*40,25+Math.random()*40);}},
        generateNalandaBackground(c, ct) { c.width = this.canvasWidth; c.height = this.canvasHeight; const floorTop = 540; ct.fillStyle = '#282a36'; ct.fillRect(0, 0, c.width, c.height); const grad = ct.createLinearGradient(0, 0, 0, floorTop); grad.addColorStop(0, '#290f3d'); grad.addColorStop(1, '#50fa7b'); ct.fillStyle = grad; ct.fillRect(0, 0, c.width, floorTop); ct.fillStyle = 'rgba(40, 42, 54, 0.8)'; ct.fillRect(0, floorTop, c.width, c.height - floorTop); for (let i = 0; i < 15; i++) { const x = Math.random() * c.width; const y = 150 + Math.random() * (floorTop - 200); const h = 50 + Math.random() * 100; ct.fillStyle = `rgba(139, 233, 253, ${Math.random() * 0.1 + 0.05})`; ct.fillRect(x, y, 30, -h); ct.strokeStyle = `rgba(139, 233, 253, 0.3)`; ct.strokeRect(x, y, 30, -h); } },
        generatePlayerSheet(c, ct) { c.width=96;c.height=160; const w=48,h=80,r='#bd93f9',s='#f8f8f2',a='#ff79c6'; ct.save();ct.translate(0,0);ct.fillStyle=r;ct.fillRect(10,20,28,55);ct.fillStyle=s;ct.fillRect(17,5,14,15);ct.fillStyle=a;ct.fillRect(10,35,28,5);ct.restore(); ct.save();ct.translate(w,0);ct.fillStyle=r;ct.fillRect(10,22,28,53);ct.fillStyle=s;ct.fillRect(17,7,14,15);ct.fillStyle=a;ct.fillRect(10,37,28,5);ct.restore(); ct.save();ct.translate(0,h);ct.fillStyle=r;ct.fillRect(10,20,28,55);ct.fillRect(5,75,10,5);ct.fillStyle=s;ct.fillRect(17,5,14,15);ct.fillStyle=a;ct.fillRect(10,35,28,5);ct.restore(); ct.save();ct.translate(w,h);ct.fillStyle=r;ct.fillRect(10,20,28,55);ct.fillRect(33,75,10,5);ct.fillStyle=s;ct.fillRect(17,5,14,15);ct.fillStyle=a;ct.fillRect(10,35,28,5);ct.restore(); },
        generateSonSheet(c, ct) { c.width=48;c.height=80; const w=48,h=80,r='#6272a4',s='#f8f8f2',a='#8be9fd'; ct.save();ct.translate(0,0);ct.fillStyle=r;ct.fillRect(10,20,28,55);ct.fillStyle=s;ct.fillRect(17,5,14,15);ct.fillStyle=a;ct.fillRect(10,35,28,5);ct.restore(); },
        generateKingSheet(c, ct) { c.width=128;c.height=100; const w=64,h=100,r='#50fa7b',s='#f8f8f2',cr='#f1fa8c',t='#6272a4'; ct.save();ct.translate(0,0);ct.fillStyle=t;ct.fillRect(0,10,64,90);ct.fillRect(10,0,44,20);ct.fillStyle=r;ct.fillRect(15,25,34,70);ct.fillStyle=s;ct.fillRect(25,15,14,15);ct.fillStyle=cr;ct.fillRect(25,10,14,5);ct.restore(); ct.save();ct.translate(w,0);ct.fillStyle=t;ct.fillRect(0,10,64,90);ct.fillRect(10,0,44,20);ct.fillStyle=r;ct.fillRect(15,26,34,69);ct.fillStyle=s;ct.fillRect(25,16,14,15);ct.fillStyle=cr;ct.fillRect(25,11,14,5);ct.restore(); },
        generateObjectSheet(c, ct) { c.width=214;c.height=160; ct.fillStyle='#9a9a9a';ct.fillRect(10,0,44,140);ct.fillStyle='#6272a4';ct.fillRect(0,140,64,20); ct.fillStyle='#ffb86c';ct.fillRect(64,0,150,100);ct.fillStyle='#ff5555';ct.fillRect(100,20,20,20);ct.fillRect(160,50,15,30); ct.fillStyle='#bd5555';ct.fillRect(64,100,80,50);ct.fillStyle='#f1fa8c';ct.fillRect(99,120,10,10); },
        generateDemonSheet(c, ct) { c.width=80; c.height=100; const b='#ff5555', e='#f1fa8c'; ct.fillStyle=b; ct.beginPath(); ct.moveTo(40,0); ct.lineTo(80,50); ct.lineTo(40,100); ct.lineTo(0,50); ct.closePath(); ct.fill(); ct.fillStyle=e; ct.fillRect(30,30,20,20); },
        generateGuardSheet(c, ct) { c.width=96; c.height=90; const w=48, h=90; const body='#6272a4', armor='#44475a', pole='#282a36'; function drawGuard(x, step){ ct.save(); ct.translate(x,0); ct.fillStyle=body; ct.fillRect(10,15,28,70); ct.fillStyle=armor; ct.fillRect(5,10,38,10); ct.fillRect(18,5,12,15); ct.fillRect(5,75,38,10); ct.fillStyle=pole; ct.fillRect(35,0,8,90); ct.restore(); } drawGuard(0); drawGuard(w);},
        generateIntricateFrame(c, ct) { const w = this.canvasWidth, h = this.canvasHeight; c.width = w; c.height = h; ct.clearRect(0, 0, w, h); const inset = 15; ct.globalCompositeOperation = 'source-over'; ct.strokeStyle = 'rgba(0,0,0,0.5)'; ct.lineWidth = inset * 2; ct.strokeRect(0, 0, w, h); ct.globalCompositeOperation = 'destination-out'; ct.clearRect(inset, inset, w - inset * 2, h - inset * 2); function drawCorner(x, y, rotation) { ct.save(); ct.translate(x, y); ct.rotate(rotation * Math.PI / 180); ct.strokeStyle = '#f1fa8c'; ct.lineWidth = 4; ct.beginPath(); ct.moveTo(0, 0); ct.bezierCurveTo(60, 20, 120, 80, 150, 150); ct.moveTo(0, 0); ct.bezierCurveTo(20, 60, 80, 120, 150, 150); ct.stroke(); ct.strokeStyle = '#ff79c6'; ct.lineWidth = 2; ct.beginPath(); ct.moveTo(30, 30); ct.arc(50, 50, 20, Math.PI, 1.5 * Math.PI); ct.stroke(); ct.fillStyle = '#bd93f9'; ct.beginPath(); ct.arc(100, 100, 4, 0, 2 * Math.PI); ct.fill(); ct.beginPath(); ct.arc(130, 60, 4, 0, 2 * Math.PI); ct.fill(); ct.restore(); } ct.globalCompositeOperation = 'source-over'; drawCorner(0, 0, 0); drawCorner(w, 0, 90); drawCorner(w, h, 180); drawCorner(0, h, 270); },
        
        async generateAllAssets() {
            const assetPromises = [
                this.generatePixelArt(this.generatePalaceBackground.bind(this)),
                this.generatePixelArt(this.generateCharnelBackground.bind(this)),
                this.generatePixelArt(this.generateNalandaBackground.bind(this)),
                this.generatePixelArt(this.generatePlayerSheet.bind(this)),
                this.generatePixelArt(this.generateKingSheet.bind(this)),
                this.generatePixelArt(this.generateObjectSheet.bind(this)),
                this.generatePixelArt(this.generateDemonSheet.bind(this)),
                this.generatePixelArt(this.generateGuardSheet.bind(this)),
                this.generatePixelArt(this.generateSonSheet.bind(this)),
                this.generatePixelArt(this.generateIntricateFrame.bind(this))
            ];
            const [palaceBg, charnelBg, nalandaBg, playerSheet, kingSheet, objectSheet, demonSheet, guardSheet, sonSheet, intricateFrame] = await Promise.all(assetPromises);
            this.assets = { palaceBg, charnelBg, nalandaBg, playerSheet, kingSheet, objectSheet, demonSheet, guardSheet, sonSheet, intricateFrame };
            this.allAssetsGenerated = true;
        },

        // =================================================================
        // MODULE: UI & INTERACTION
        // =================================================================
        setupAudio() { if (Tone.context.state !== 'running') { Tone.start(); } this.gain = new Tone.Gain(0.2).toDestination(); this.reverb = new Tone.Reverb({ decay: 4, wet: 0.5 }).connect(this.gain); this.synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fatsawtooth" }, envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.8 } }).connect(this.reverb); },
        playSound(note) { if(this.synth) this.synth.triggerAttackRelease(note, "8n"); },
        playSuccessSound() { if(this.synth) this.synth.triggerAttackRelease(["C4", "E4", "G4", "C5"], "4n"); },
        playWaveClearSound() { if(this.synth) this.synth.triggerAttackRelease(["C4", "G4"], "8n"); },
        playFailureSound() { if(this.synth) this.synth.triggerAttackRelease("C3", "4n"); },
        playAmbiance(notes) { if (this.musicLoop) this.musicLoop.stop(0).dispose(); if (this.synth) { this.musicLoop = new Tone.Loop(time => { this.synth.triggerAttackRelease(notes, "2m", time); }, "1m").start(0); Tone.Transport.start(); } },
        
        startCutscene(eventQueue) {
            this.state.current = this.GameState.CUTSCENE;
            this.state.cutsceneQueue = [...eventQueue];
            this.state.isCutsceneEventRunning = false;
        },
        
        showMap() { this.state.current = this.GameState.MAP; this.dialogue.isActive = false; this.mapLocations.innerHTML = ''; for (const worldKey in this.worlds) { const world = this.worlds[worldKey]; const loc = document.createElement('div'); loc.className = 'map-location'; loc.textContent = world.name; const isLocked = world.isLocked ? world.isLocked(this, this.state) : false; if (isLocked) { loc.classList.add('locked'); } else { loc.onclick = () => this.loadWorld(worldKey); } this.mapLocations.appendChild(loc); } this.mapScreen.style.display = 'flex'; },
        showControlsGuide() { 
            this.controlsGuide.innerHTML = "← → to Move | 'A' to Interact";
            if (this.state.siddhis.has("Phurba of Stability")) {
                this.controlsGuide.innerHTML = "← → Move | 'S' to Toggle Aim | 'A' to Fire";
            }
            this.controlsGuide.style.opacity = 1; 
            setTimeout(() => { this.controlsGuide.style.opacity = 0; }, 4000); 
        },

        startDialogue(dialogueKey) {
            const world = this.worlds[this.state.world];
            let data = world.dialogues[dialogueKey];
            if (!data) return;

            this.state.current = this.GameState.DIALOGUE;
            this.dialogue.isActive = true;
            this.dialogue.currentKey = dialogueKey;
            
            if (typeof data === 'object' && !Array.isArray(data)) {
                this.dialogue.isChoice = true;
                this.dialogue.choices = Object.entries(data).map(([text, key]) => ({ text, key }));
                this.dialogue.choiceIndex = 0;
                this.renderChoices();
            } else {
                this.dialogue.isChoice = false;
                this.dialogue.currentLines = data;
                this.dialogue.lineIndex = 0;
                this.typewriterEffect(this.dialogue.currentLines[0]);
            }
        },

        renderChoices() {
            let html = '<ul class="dialogue-choice-list">';
            this.dialogue.choices.forEach((choice, index) => {
                const isSelected = index === this.dialogue.choiceIndex;
                html += `<li class="dialogue-choice-item ${isSelected ? 'selected' : ''}">✧ ${choice.text}</li>`;
            });
            html += '</ul>';
            this.dialogueText.innerHTML = html;
        },

        typewriterEffect(text, i = 0) {
            clearTimeout(this.dialogue.typingTimeout);
            if (!this.dialogue.isChoice) { 
                 this.dialogueText.innerHTML = text.substring(0, i + 1);
                 if (i < text.length) {
                    this.dialogue.typingTimeout = setTimeout(() => this.typewriterEffect(text, i + 1), 30);
                }
            }
        },

        handleDialogueAdvance() {
            const d = this.dialogue;
            if (d.isChoice) return;
        
            if (this.dialogueText.innerHTML.length < d.currentLines[d.lineIndex].length) {
                clearTimeout(d.typingTimeout);
                this.dialogueText.innerHTML = d.currentLines[d.lineIndex];
                return;
            }
        
            d.lineIndex++;
            if (d.lineIndex < d.currentLines.length) {
                this.typewriterEffect(d.currentLines[d.lineIndex]);
            } else {
                this.endDialogue();
            }
        },

        confirmDialogueChoice() {
            const d = this.dialogue;
            if (!d.isChoice) return;
            this.playSound("E4");
            const selectedChoice = d.choices[d.choiceIndex];
            const nextDialogueKey = selectedChoice.key;
            
            d.isChoice = false;
            d.choices = [];
            this.startDialogue(nextDialogueKey);
        },

        endDialogue() {
            const world = this.worlds[this.state.world];
            const key = this.dialogue.currentKey;
            
            this.dialogue.isActive = false;
            if (world.onDialogueEnd) {
                world.onDialogueEnd(this, key);
            } else {
                this.state.current = this.GameState.GAMEPLAY;
            }
        },
        updateSiddhiUI() { this.siddhiList.innerHTML = ''; this.state.siddhis.forEach(siddhi => { const li = document.createElement('li'); li.textContent = siddhi; this.siddhiList.appendChild(li); }); },
        interactWith(objectId) { this.vhsOverlay.classList.add('vhs-active'); setTimeout(() => this.vhsOverlay.classList.remove('vhs-active'), 300); this.playSound("E3"); const world = this.worlds[this.state.world]; if (world.onInteract) { world.onInteract(this, objectId); } },
        startRhythmGame(sequence) { this.state.current = this.GameState.RHYTHM; this.dialogue.isActive = false; this.rhythmSequence = sequence; this.playerSequenceIndex = 0; this.rhythmContainer.innerHTML = ''; this.rhythmSequence.forEach(char => { const div = document.createElement('div'); div.className = 'rhythm-char'; div.id = `rhythm-${char}`; div.textContent = char.toUpperCase(); this.rhythmContainer.appendChild(div); }); },
        handleRhythmInput(key) { if (this.state.current !== this.GameState.RHYTHM) return; const targetChar = this.rhythmSequence[this.playerSequenceIndex]; if (key === targetChar) { this.playSound("C4"); const charDiv = document.getElementById(`rhythm-${targetChar}`); if (charDiv) charDiv.classList.add('correct'); this.playerSequenceIndex++; if (this.playerSequenceIndex === this.rhythmSequence.length) { this.playSuccessSound(); this.rhythmContainer.innerHTML = ''; const world = this.worlds[this.state.world]; if (world.onRhythmSuccess) { world.onRhythmSuccess(this); } } } else if (this.rhythmSequence.includes(key)) { this.playFailureSound(); } },

        firePhurba() {
            this.playSound("F#4");
            this.phurba.active = true;
            const playerCenter = { x: this.player.x + this.player.width / 2, y: this.player.y + this.player.height / 2 };
            this.phurba.x = playerCenter.x;
            this.phurba.y = playerCenter.y;
            
            const angle = Math.atan2(this.reticle.y - playerCenter.y, this.reticle.x - playerCenter.x);
            this.phurba.vx = Math.cos(angle) * this.phurba.speed;
            this.phurba.vy = Math.sin(angle) * this.phurba.speed;
            
            const world = this.worlds[this.state.world];
            if (world.onPuzzleStart) {
                world.onPuzzleStart(this);
            }
        },

        // =================================================================
        // MODULE: MAIN GAME LOOP
        // =================================================================
        update() {
            const world = this.worlds[this.state.world];
            if (!world) return;
            
            if (this.state.fadeMode) { let isFadeDone = false; if (this.state.fadeMode === 'out') { this.state.fadeAlpha += 0.05; if (this.state.fadeAlpha >= 1) { this.state.fadeAlpha = 1; isFadeDone = true; } } else if (this.state.fadeMode === 'in') { this.state.fadeAlpha -= 0.05; if (this.state.fadeAlpha <= 0) { this.state.fadeAlpha = 0; isFadeDone = true; } } if (isFadeDone) { const callback = this.state.onFadeComplete; this.state.fadeMode = null; this.state.onFadeComplete = null; if (callback) callback(); } }
            
            if (this.state.current === this.GameState.CUTSCENE) {
                if (world.onAnimate) { world.onAnimate(this); }
                if (this.state.isCutsceneEventRunning) return;

                if (this.state.cutsceneQueue.length > 0) {
                    const event = this.state.cutsceneQueue.shift();
                    this.state.isCutsceneEventRunning = true;
                    
                    switch (event.type) {
                        case 'run': case 'call_function': if (event.action) event.action(this, world); if (event.func) event.func(this, world); this.state.isCutsceneEventRunning = false; break;
                        case 'wait': setTimeout(() => { this.state.isCutsceneEventRunning = false; }, event.duration); break;
                        case 'text': this.cutsceneText.textContent = event.line; this.cutsceneText.style.display = 'block'; this.cutsceneText.style.opacity = 1; setTimeout(() => { this.cutsceneText.style.opacity = 0; setTimeout(() => { this.cutsceneText.style.display = 'none'; this.state.isCutsceneEventRunning = false; }, 500); }, event.duration); break;
                        case 'move': const obj = world.objects.find(o => o.id === event.objectId); if (!obj) { this.state.isCutsceneEventRunning = false; break; } const moveInterval = setInterval(() => { let dx = event.targetX - obj.x; let dy = event.targetY - obj.y; if (Math.abs(dx) < event.speed && Math.abs(dy) < event.speed) { obj.x = event.targetX; obj.y = event.targetY; clearInterval(moveInterval); this.state.isCutsceneEventRunning = false; } else { let angle = Math.atan2(dy, dx); obj.x += Math.cos(angle) * event.speed; obj.y += Math.sin(angle) * event.speed; } }, 16); break;
                        case 'fade': this.state.fadeMode = event.direction; this.state.onFadeComplete = () => { this.state.isCutsceneEventRunning = false; }; break;
                    }
                } else { this.state.current = this.GameState.GAMEPLAY; }
                return;
            }

            if (this.state.current === this.GameState.GAMEPLAY) {
                this.player.isMoving = false;
                if (this.keys.arrowleft) { this.player.x -= this.player.speed; this.player.isMoving = true; this.player.sprite.direction = -1; }
                if (this.keys.arrowright) { this.player.x += this.player.speed; this.player.isMoving = true; this.player.sprite.direction = 1; }
                this.player.sprite.currentAnim = this.player.isMoving ? 'walk' : 'idle';
                if (this.player.x < 0) this.player.x = 0;
                if (this.player.x > this.canvasWidth - this.player.width) this.player.x = this.canvasWidth - this.player.width;
            }

            if (this.state.current === this.GameState.AIMING) {
                if (this.keys.arrowleft) { this.reticle.x -= this.reticle.speed; }
                if (this.keys.arrowright) { this.reticle.x += this.reticle.speed; }
                if (this.keys.arrowup) { this.reticle.y -= this.reticle.speed; }
                if (this.keys.arrowdown) { this.reticle.y += this.reticle.speed; }
                 if (this.reticle.x < 0) this.reticle.x = 0;
                 if (this.reticle.x > this.canvasWidth) this.reticle.x = this.canvasWidth;
                 if (this.reticle.y < 0) this.reticle.y = 0;
                 if (this.reticle.y > this.canvasHeight) this.reticle.y = this.canvasHeight;
            }

            if (world.onUpdate) {
                world.onUpdate(this);
            }

            if (this.phurba.active) {
                this.phurba.x += this.phurba.vx;
                this.phurba.y += this.phurba.vy;

                world.objects.forEach(obj => {
                    if (obj.isRitualStone && !obj.isStabilized && !obj.hidden &&
                        this.phurba.x > obj.x && this.phurba.x < obj.x + obj.width &&
                        this.phurba.y > obj.y && this.phurba.y < obj.y + obj.height) {
                            obj.isStabilized = true;
                            obj.stabilizedTimer = 20000;
                            this.phurba.active = false; 
                            this.playSound("G5");
                            
                            if(world.onPuzzleCheck) {
                                world.onPuzzleCheck(this);
                            }
                    }
                });

                if (this.phurba.x < 0 || this.phurba.x > this.canvasWidth || this.phurba.y < 0 || this.phurba.y > this.canvasHeight) {
                    this.phurba.active = false;
                }
            }
            
            if (this.state.current === this.GameState.GAMEPLAY || this.state.current === this.GameState.AIMING) {
                let closestDist = Infinity; this.targetableObject = null;
                for (const obj of world.objects) { 
                    if(obj.hidden) continue; 
                    const playerCenterX = this.player.x + this.player.width / 2; 
                    const objCenterX = obj.x + obj.width / 2; 
                    const dist = Math.abs(playerCenterX - objCenterX) - (obj.width / 2); 
                    if (dist < 50 && dist < closestDist) { 
                        closestDist = dist; 
                        this.targetableObject = obj; 
                    } 
                }
                if (this.keys.a && !this.actionPressed && this.state.current === this.GameState.GAMEPLAY) { 
                    this.actionPressed = true; 
                    if (this.targetableObject) { 
                        this.interactWith(this.targetableObject.id); 
                    } 
                }
                this.frameCount++;
                if (this.frameCount % this.animationSpeed === 0) { const p_sprite = this.player.sprite; p_sprite.currentFrame = (p_sprite.currentFrame + 1) % p_sprite[p_sprite.currentAnim].frames; if(world.onAnimate) { world.onAnimate(this); } }
            }
        },

        draw() {
            this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            const world = this.worlds[this.state.world];

            if (this.state.current !== this.GameState.TITLE && this.state.current !== this.GameState.MAP) {
                if(world && world.background) { this.ctx.drawImage(world.background, 0, 0, this.canvasWidth, this.canvasHeight); }
                if(world) {
                    world.objects.forEach(obj => {
                        if (obj.hidden) return;
                        
                        this.ctx.save();
                        
                        if(obj.isRitualStone) {
                             const color = '#ffb86c';
                             if (obj.isStabilized) {
                                this.ctx.globalAlpha = 1.0;
                                const borderColor = '#f1fa8c';
                                this.ctx.fillStyle = borderColor;
                                this.ctx.fillRect(obj.x - 2, obj.y - 2, obj.width + 4, obj.height + 4);
                                this.ctx.fillStyle = color;
                                this.ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
                            } else {
                                this.ctx.globalAlpha = 0.7;
                                this.ctx.fillStyle = color;
                                this.ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
                                this.ctx.strokeStyle = '#f8f8f2';
                                this.ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
                            }
                        } else {
                             if (obj === this.targetableObject && this.state.current === this.GameState.GAMEPLAY) { this.ctx.shadowColor = '#bd93f9'; this.ctx.shadowBlur = 20; }
                             if (obj.sprite && obj.sprite.sheet) {
                                if (obj.sprite.frames > 1) { this.ctx.drawImage(obj.sprite.sheet, obj.sprite.currentFrame * obj.sprite.frameWidth, obj.sprite.y, obj.sprite.frameWidth, obj.sprite.frameHeight, obj.x, obj.y, obj.width, obj.height); } else { this.ctx.drawImage(obj.sprite.sheet, obj.sprite.sx || 0, obj.sprite.sy || 0, obj.sprite.sWidth || obj.width, obj.sprite.sHeight || obj.height, obj.x, obj.y, obj.width, obj.height); }
                            }
                        }
                        
                        this.ctx.restore();

                        this.ctx.fillStyle = '#f8f8f2'; this.ctx.font = '20px VT323'; this.ctx.textAlign = 'center'; this.ctx.shadowColor = '#000'; this.ctx.shadowBlur = 5;
                        if (!obj.hideName && !obj.isRitualStone) this.ctx.fillText(obj.name, obj.x + obj.width / 2, obj.y - 15);
                        this.ctx.shadowBlur = 0;
                    });

                    // Draw Beams
                    this.beams.forEach(beam => {
                        this.ctx.save();
                        this.ctx.beginPath();
                        this.ctx.moveTo(beam.from.x, beam.from.y);
                        this.ctx.lineTo(beam.to.x, beam.to.y);
                        this.ctx.strokeStyle = `rgba(241, 250, 140, ${beam.alpha})`;
                        this.ctx.lineWidth = 3;
                        this.ctx.stroke();
                        this.ctx.restore();
                    });

                    // Draw Player
                    const p_sprite = this.player.sprite;
                    if (p_sprite.sheet) { const p_anim = p_sprite[p_sprite.currentAnim]; this.ctx.save(); this.ctx.translate(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2); this.ctx.scale(p_sprite.direction, 1); this.ctx.drawImage(p_sprite.sheet, p_sprite.currentFrame * p_sprite.frameWidth, p_anim.y, p_sprite.frameWidth, p_sprite.frameHeight, -this.player.width / 2, -this.player.height / 2, this.player.width, this.player.height); this.ctx.restore(); }
                }
            }
            
            // Draw Phurba Projectile
            if (this.phurba.active) {
                this.ctx.save();
                this.ctx.fillStyle = '#8be9fd';
                this.ctx.shadowColor = '#8be9fd';
                this.ctx.shadowBlur = 15;
                this.ctx.beginPath();
                this.ctx.arc(this.phurba.x, this.phurba.y, this.phurba.size / 2, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.restore();
            }

            // Draw Aiming Reticle
            if (this.state.current === this.GameState.AIMING) {
                this.ctx.save();
                this.ctx.strokeStyle = '#ff79c6';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(this.reticle.x, this.reticle.y, 15, 0, 2 * Math.PI);
                this.ctx.moveTo(this.reticle.x - 20, this.reticle.y);
                this.ctx.lineTo(this.reticle.x + 20, this.reticle.y);
                this.ctx.moveTo(this.reticle.x, this.reticle.y - 20);
                this.ctx.lineTo(this.reticle.x, this.reticle.y + 20);
                this.ctx.stroke();
                
                const playerCenter = { x: this.player.x + this.player.width / 2, y: this.player.y + this.player.height / 2 };
                this.ctx.setLineDash([5, 15]);
                this.ctx.beginPath();
                this.ctx.moveTo(playerCenter.x, playerCenter.y);
                this.ctx.lineTo(this.reticle.x, this.reticle.y);
                this.ctx.stroke();

                this.ctx.restore();
            }


            this.dialogueBox.style.display = this.dialogue.isActive ? 'block' : 'none';
            document.getElementById('dialogue-prompt').style.display = (this.dialogue.isActive && !this.dialogue.isChoice) ? 'block' : 'none';

            if (this.state.fadeAlpha > 0) { this.ctx.fillStyle = `rgba(0, 0, 0, ${this.state.fadeAlpha})`; this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight); }
        },

        gameLoop() {
            this.update();
            this.draw();
            requestAnimationFrame(() => this.gameLoop());
        },
        
        loadWorld(worldId) {
            this.state.world = worldId;
            const world = this.worlds[worldId];
            if (world.onLoad) { world.onLoad(this); }
            this.mapScreen.style.display = 'none';
            this.state.current = this.GameState.GAMEPLAY;
            this.player.x = 450;
            this.player.y = 570;
            if(Tone.Transport.state === 'started') Tone.Transport.stop();
            Tone.Transport.cancel();
            this.playAmbiance(world.ambiance);

            if (world.frameAsset && this.assets[world.frameAsset]) {
                this.frameOverlay.style.backgroundImage = `url(${this.assets[world.frameAsset].src})`;
            } else {
                this.frameOverlay.style.backgroundImage = 'none';
            }

            this.showControlsGuide();
        }
    };

    window.Game = Game;
    window.registerMandala = function(id, definition) {
        Game.worlds[id] = definition;
    };
}