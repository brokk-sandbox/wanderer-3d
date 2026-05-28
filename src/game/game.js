import * as THREE from 'three';
        import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
        import { getDisplayName, itemDisplayNames, toolbarLayout, recipes, createSpawnConfig, WEAPON_TYPES, PLACEABLE_ITEMS, UNSTACKABLE_ITEMS } from './data/config.js';
        import { getElevation } from './terrain.js';
        import { createAudioPlayer } from './audio.js';

        /* ===== GLOBAL STATE ===== */
        let camera, scene, renderer, controls, floorMesh, raycaster, skyUniforms;
        const mouse = new THREE.Vector2();

        /* ===== SPAWN CONFIGURATION ===== */
        const spawnConfig = createSpawnConfig();

        // Global audio/sound helper
        const playSfx = createAudioPlayer();

        /* ===== STATS CLASS ===== */
        class Stats {
            constructor(maxHp) { this.maxHp = maxHp; this.hp = maxHp; }
            takeDamage(amt) { this.hp = Math.max(0, this.hp - amt); return this.hp <= 0; }
            heal(amt) { this.hp = Math.min(this.maxHp, this.hp + amt); }
        }
        const playerStats = new Stats(100);

        /* ===== BOAR CLASS ===== */
        class Boar {
            constructor() {
                this.group = new THREE.Group();
                // Body
                const body = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 6), new THREE.MeshPhongMaterial({ color: 0x4b3621 }));
                body.castShadow = true;
                this.group.add(body);
                // Head
                const head = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5), new THREE.MeshPhongMaterial({ color: 0x3b2611 }));
                head.position.set(0, 0.5, 3.5);
                this.group.add(head);
                // Tusks
                const tusks = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 0.5), new THREE.MeshPhongMaterial({ color: 0xeeeeee }));
                tusks.position.set(0, -0.2, 4.5);
                head.add(tusks);

                const spawn = getValidSpawn();
                const x = spawn ? spawn.x : 0;
                const z = spawn ? spawn.z : 0;
                this.group.position.set(x, Math.max(getElevation(x, z), -2) + 1.5, z);
                scene.add(this.group);
                this.stats = new Stats(5);
                this.state = 'WANDER';
                this.targetAngle = Math.random() * Math.PI * 2;
                this.lastChange = 0;
                this.attackCooldown = 0;
            }

            update(time, playerPos) {
                const dist = this.group.position.distanceTo(playerPos);
                
                let speed = this.state === 'AGGRESSIVE' ? 0.3 : 0.1;
                const moveDir = new THREE.Vector3();

                if (this.state === 'AGGRESSIVE') {
                    moveDir.subVectors(playerPos, this.group.position).normalize();
                    this.group.lookAt(playerPos.x, this.group.position.y, playerPos.z);
                    if (dist < 8 && time > this.attackCooldown) {
                        playerStats.takeDamage(10);
                        updateUI();
                        playSfx(100, 'sawtooth', 0.3, 0.2);
                        this.attackCooldown = time + 1500;
                    }
                } else {
                    if (time - this.lastChange > 3000) {
                        this.targetAngle = Math.random() * Math.PI * 2;
                        this.lastChange = time;
                    }
                    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.targetAngle, 0.02);
                    moveDir.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
                }

                const nextX = this.group.position.x + moveDir.x * speed;
                const nextZ = this.group.position.z + moveDir.z * speed;
                const nextElev = getElevation(nextX, nextZ);

                if (nextElev < -3) { // Avoid deep water
                    if (this.state === 'WANDER') {
                        this.targetAngle += Math.PI; // Turn around
                        this.lastChange = time;
                    }
                } else {
                    this.group.position.x = nextX;
                    this.group.position.z = nextZ;
                    this.group.position.y = Math.max(nextElev, -2) + 1.5;
                }

                if (dist < 40) {
                    document.getElementById('boar-ui').style.display = 'block';
                    document.getElementById('boar-ui').innerText = "Boar: Neutral";
                } else if (dist > 100) {
                    document.getElementById('boar-ui').style.display = 'none';
                }
            }

            takeDamage() {
                this.state = 'AGGRESSIVE';
                playSfx(200, 'sawtooth', 0.2, 0.2);
                if (this.stats.takeDamage(1)) {
                    this.dropLoot();
                    scene.remove(this.group);
                    return true;
                }
                return false;
            }

            dropLoot() {
                [{ type: 'Meat', c: 0xa52a2a, s: [1, 0.5, 1.5] }, { type: 'Leather', c: 0xc19a6b, s: [1.2, 0.1, 1.5] }].forEach(d => {
                    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshPhongMaterial({ color: d.c }));
                    mesh.scale.set(...d.s);
                    mesh.position.copy(this.group.position);
                    mesh.position.x += Math.random() * 4 - 2;
                    mesh.position.z += Math.random() * 4 - 2;
                    mesh.position.y = Math.max(getElevation(mesh.position.x, mesh.position.z), -2) + 1;
                    mesh.itemType = d.type;
                    mesh.castShadow = true;
                    scene.add(mesh);
                    objects.push(mesh);
                });
            }
        }

        /* ===== AUDIO ===== */

        /* ===== UI INITIALIZATION ===== */
        // Toolbar order: L-HAND, ACT1, ACT2, ACT3, R-HAND
        // toolbar-slot-0 = L-HAND (equip lhand)
        // toolbar-slot-1 = ACT 1 (pocket slot 0, key 1)
        // toolbar-slot-2 = ACT 2 (pocket slot 1, key 2)
        // toolbar-slot-3 = ACT 3 (pocket slot 2, key 3)
        // toolbar-slot-4 = R-HAND (equip rhand)

        function initUI() {
            const tbg = document.getElementById('toolbar-grid');
            tbg.innerHTML = '';
            toolbarLayout.forEach((def, i) => {
                // Add separator before ACT 1 and after ACT 3
                if (i === 1 || i === 4) {
                    const sep = document.createElement('div');
                    sep.className = 'toolbar-sep';
                    tbg.appendChild(sep);
                }
                const slot = document.createElement('div');
                slot.className = 'slot';
                slot.id = def.id;
                const label = document.createElement('div');
                label.className = 'toolbar-label';
                label.innerText = def.label;
                slot.appendChild(label);
                // Add key hint for action slots
                if (def.key) {
                    const keyHint = document.createElement('div');
                    keyHint.className = 'toolbar-key';
                    keyHint.innerText = `[ ${def.key} ]`;
                    slot.appendChild(keyHint);
                }
                slot.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    if (def.type === 'equip') handleEquipClick(def.slot);
                    else handleSlotClick(def.pocketIdx, e);
                });
                tbg.appendChild(slot);
            });

            // Pocket slots event handlers
            for (let i = 0; i < 4; i++) {
                const slot = document.getElementById(`pocket-${i}`);
                if (slot) slot.addEventListener('mousedown', (e) => { e.stopPropagation(); handleSlotClick(i, e); });
            }

            // Backpack grid: 12 slots (3x4), indices 4-15
            const bg = document.getElementById('bag-grid');
            bg.innerHTML = '';
            for (let i = 4; i < 16; i++) {
                const slot = document.createElement('div');
                slot.className = 'slot';
                slot.id = `slot-${i}`;
                slot.addEventListener('mousedown', (e) => { e.stopPropagation(); handleSlotClick(i, e); });
                bg.appendChild(slot);
            }

            // Storage Box grid: 24 slots, indices 16-39
            const bx = document.getElementById('box-grid');
            bx.innerHTML = '';
            for (let i = 16; i < 40; i++) {
                const slot = document.createElement('div');
                slot.className = 'slot';
                slot.id = `slot-${i}`;
                slot.addEventListener('mousedown', (e) => { e.stopPropagation(); handleSlotClick(i, e); });
                bx.appendChild(slot);
            }

            // Equipment slot click handlers
            ['back', 'armor', 'lhand', 'rhand', 'head', 'torso', 'legs', 'feet'].forEach(slotName => {
                const el = document.getElementById(`slot-${slotName}`);
                if (el) el.addEventListener('mousedown', () => handleEquipClick(slotName));
            });

            // [X] Close buttons — all use data-win attribute
            document.querySelectorAll('.win-close').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const winType = btn.getAttribute('data-win');
                    toggleWindow(winType);
                });
            });

            // Menu buttons — bound in JS, not HTML onclick
            document.getElementById('btn-start').addEventListener('click', startGame);
            document.getElementById('btn-resume').addEventListener('click', startGame);
            document.getElementById('btn-save').addEventListener('click', saveGame);
            document.getElementById('btn-load').addEventListener('click', loadGame);
            document.getElementById('btn-quit').addEventListener('click', () => toggleWindow('menu'));
            document.getElementById('btn-admin').addEventListener('click', () => {
                const panel = document.getElementById('admin-panel');
                const isVisible = panel.style.display === 'block';
                panel.style.display = isVisible ? 'none' : 'block';
                if (!isVisible) buildAdminPanel();
            });
            document.getElementById('btn-give').addEventListener('click', () => giveItem());
        }

        /* ===== SLOT CLICK HANDLER ===== */
        function handleSlotClick(idx, e) {
            playSfx(800, 'sine', 0.1, 0.1);
            let arr = inventorySlots;
            let actualIdx = idx;

            // Storage box slots (16+)
            if (idx >= 16) {
                if (!openBoxId) return;
                arr = placedBoxes[openBoxId];
                actualIdx = idx - 16;
            }

            // Pockets require pants
            if (idx < 4 && !equipmentSlots.legs) { playSfx(100, 'square', 0.1, 0.1); return; }
            // Backpack slots require backpack
            if (idx >= 4 && idx < 16 && !equipmentSlots.back) { playSfx(100, 'square', 0.1, 0.1); return; }

            // Right-click to consume
            if (e && (e.button === 2 || e.ctrlKey)) {
                const item = arr[actualIdx];
                if (item && item.type === 'CookedMeat') {
                    playerStats.heal(30);
                    item.count--;
                    if (item.count <= 0) arr[actualIdx] = null;
                    updateUI();
                }
                return;
            }

            // Pick up or swap
            if (!heldItem) {
                if (arr[actualIdx]) {
                    heldItem = { ...arr[actualIdx], fromIndex: idx };
                    arr[actualIdx] = null;
                    if (e) {
                        const di = document.getElementById('drag-icon');
                        di.style.left = e.clientX + 'px';
                        di.style.top = e.clientY + 'px';
                    }
                }
            } else {
                const target = arr[actualIdx];
                if (!target) {
                    arr[actualIdx] = { ...heldItem };
                    heldItem = null;
                } else if (target.type === heldItem.type && !['StorageBox', 'Pants', 'Backpack'].includes(target.type)) {
                    target.count += heldItem.count;
                    heldItem = null;
                } else {
                    const tmp = arr[actualIdx];
                    arr[actualIdx] = { ...heldItem };
                    heldItem = { ...tmp, fromIndex: idx };
                }
            }
            updateUI();
        }

        /* ===== EQUIP CLICK HANDLER ===== */
        function handleEquipClick(slot) {
            playSfx(800, 'sine', 0.1, 0.1);
            const weapons = WEAPON_TYPES;

            if (!heldItem) {
                if (equipmentSlots[slot]) {
                    heldItem = { ...equipmentSlots[slot], fromIndex: -1 };
                    equipmentSlots[slot] = null;
                }
            } else {
                // Validate equipment type for slot
                if (slot === 'back' && heldItem.type !== 'Backpack') return;
                if (slot === 'head' && heldItem.type !== 'Hat') return;
                if (slot === 'torso' && heldItem.type !== 'Shirt') return;
                if (slot === 'legs' && heldItem.type !== 'Pants') return;
                if ((slot === 'lhand' || slot === 'rhand') && !weapons.includes(heldItem.type)) return;

                const tmp = equipmentSlots[slot];
                equipmentSlots[slot] = { ...heldItem, count: 1 };
                heldItem.count--;
                if (heldItem.count <= 0) {
                    heldItem = tmp;
                    if (heldItem) heldItem.fromIndex = -1;
                }
            }

            // Show/hide bag and pockets windows based on equipment
            const bWin = document.getElementById('bag-window');
            const pWin = document.getElementById('pockets-window');
            if (slot === 'back' && bWin) bWin.style.display = equipmentSlots.back ? 'block' : 'none';
            if (slot === 'legs' && pWin) pWin.style.display = equipmentSlots.legs ? 'block' : 'none';
            updateUI();
        }

        /* ===== WINDOW TOGGLE ===== */
        function toggleWindow(type) {
            const wins = {
                bag: 'bag-window', box: 'box-window', craft: 'craft-window',
                equip: 'equip-window', menu: 'main-menu', pockets: 'pockets-window'
            };
            const target = document.getElementById(wins[type]);
            if (!target) return;
            const isVisible = target.style.display === 'block' || target.style.display === 'flex';

            if (isVisible) {
                target.style.display = 'none';
                if (type === 'equip') {
                    document.getElementById(wins.bag).style.display = 'none';
                    document.getElementById(wins.pockets).style.display = 'none';
                }
                if (type === 'box') { openBoxId = null; }
            } else {
                if (type === 'bag' && !equipmentSlots.back) return;
                if (type === 'pockets' && !equipmentSlots.legs) return;
                target.style.display = (type === 'menu' ? 'flex' : 'block');
                if (type === 'equip') {
                    if (equipmentSlots.legs) document.getElementById(wins.pockets).style.display = 'block';
                    if (equipmentSlots.back) document.getElementById(wins.bag).style.display = 'block';
                }
                if (type === 'craft') showCrafting('Hand');
            }

            // Lock/unlock pointer based on whether any window is open
            const anyOpen = Object.values(wins).some(id => {
                const el = document.getElementById(id);
                return el && (el.style.display === 'block' || el.style.display === 'flex');
            });
            if (anyOpen) controls.unlock();
            else controls.lock();
        }

        /* ===== GAME START/SAVE/LOAD ===== */
        function startGame() {
            ['bag-window', 'box-window', 'craft-window', 'equip-window', 'main-menu', 'pockets-window'].forEach(id =>
                document.getElementById(id).style.display = 'none'
            );
            document.getElementById('btn-resume').style.display = 'block';
            if (controls) controls.lock();
        }

        function saveGame() {
            const world = objects.filter(o => o.itemType).map(o => ({
                type: o.itemType, pos: { x: o.position.x, y: o.position.y, z: o.position.z },
                rot: { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z },
                scl: { x: o.scale.x, y: o.scale.y, z: o.scale.z },
                boxId: o.boxId, stationType: o.stationType,
                isOpen: o.userData ? o.userData.isOpen : undefined,
                pivotRot: o.itemType === 'WoodDoor' ? o.children[0].rotation.y : undefined
            }));
            const pos = controls.getObject().position;
            const save = {
                player: { hp: playerStats.hp, pos: { x: pos.x, y: pos.y, z: pos.z } },
                inventory: inventorySlots, equipment: equipmentSlots, world, boxes: placedBoxes
            };
            localStorage.setItem('wanderer_save', JSON.stringify(save));
            alert("Game Saved!");
        }

        function loadGame() {
            const raw = localStorage.getItem('wanderer_save');
            if (!raw) { alert("No save found."); return; }
            const data = JSON.parse(raw);
            playerStats.hp = data.player.hp;
            const p = controls.getObject().position;
            p.set(data.player.pos.x, data.player.pos.y, data.player.pos.z);

            data.inventory.forEach((s, i) => inventorySlots[i] = s);
            Object.assign(equipmentSlots, data.equipment);
            Object.assign(placedBoxes, data.boxes);

            // Clear existing world objects
            objects.forEach(o => scene.remove(o));
            objects.length = 0;

            // Rebuild world
            data.world.forEach(d => {
                let mesh;
                if (d.type === 'WoodFoundation') {
                    mesh = new THREE.Mesh(new THREE.BoxGeometry(20, 2, 20), new THREE.MeshPhongMaterial({ color: 0x8b4513 }));
                } else if (d.type === 'WoodWall') {
                    mesh = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 2), new THREE.MeshPhongMaterial({ color: 0x8b4513 }));
                } else if (d.type === 'WoodRoof') {
                    mesh = new THREE.Mesh(new THREE.BoxGeometry(20, 2, 20), new THREE.MeshPhongMaterial({ color: 0xa0522d }));
                } else if (d.type === 'WoodDoorway') {
                    mesh = buildDoorwayMesh();
                } else if (d.type === 'WoodDoor') {
                    mesh = buildDoorMesh();
                    if (d.isOpen !== undefined) {
                        mesh.userData.isOpen = d.isOpen;
                        if (d.isOpen) mesh.children[0].rotation.y = d.pivotRot !== undefined ? d.pivotRot : Math.PI / 2;
                    }
                } else if (d.type === 'Wood') {
                    mesh = new THREE.Mesh(
                        new THREE.CylinderGeometry(1, 1.5, 10, 8),
                        new THREE.MeshPhongMaterial({ color: 0x4d2911 })
                    );
                } else if (d.type === 'Leaves') {
                    mesh = new THREE.Mesh(
                        new THREE.DodecahedronGeometry(5),
                        new THREE.MeshPhongMaterial({ color: 0x114d11 })
                    );
                } else if (d.type === 'Rock') {
                    mesh = new THREE.Mesh(
                        new THREE.DodecahedronGeometry(3),
                        new THREE.MeshPhongMaterial({ color: 0x888888, flatShading: true })
                    );
                } else if (d.type === 'Shrub') {
                    mesh = new THREE.Mesh(
                        new THREE.DodecahedronGeometry(2),
                        new THREE.MeshPhongMaterial({ color: 0x228b22 })
                    );
                } else {
                    let color = 0x6d3b1a;
                    if (d.type === 'Campfire') color = 0x8b4513;
                    if (d.type === 'Workbench') color = 0x5d2e0a;
                    mesh = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 6), new THREE.MeshPhongMaterial({ color }));
                    if (d.type === 'StorageBox') {
                        mesh.geometry = new THREE.BoxGeometry(6, 6, 6);
                        const lid = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.2, 6.5), new THREE.MeshPhongMaterial({ color: 0x3d210e }));
                        lid.position.y = 3;
                        mesh.add(lid);
                    } else if (d.type === 'Campfire') {
                        const fireMesh = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff4500 }));
                        fireMesh.position.y = 2;
                        mesh.add(fireMesh);
                    } else if (d.type === 'Workbench') {
                        const top = new THREE.Mesh(new THREE.BoxGeometry(8, 1, 4), new THREE.MeshPhongMaterial({ color: 0x8b4513 }));
                        top.position.y = 3;
                        mesh.add(top);
                    }
                }
                mesh.position.set(d.pos.x, d.pos.y, d.pos.z);
                mesh.rotation.set(d.rot.x, d.rot.y, d.rot.z);
                if (d.scl) mesh.scale.set(d.scl.x, d.scl.y, d.scl.z);
                mesh.itemType = d.type;
                mesh.boxId = d.boxId;
                mesh.stationType = d.stationType;
                mesh.castShadow = true;
                scene.add(mesh);
                objects.push(mesh);
            });
            updateUI();
            startGame();
        }

        /* ===== CRAFTING ===== */
        function showCrafting(station) {
            const list = document.getElementById('recipe-list');
            const title = document.getElementById('craft-title');
            if (!list) return;
            list.innerHTML = '';
            title.innerText = station === 'Hand' ? 'Hand Crafting' : station;
            (recipes[station] || []).forEach(recipe => {
                const div = document.createElement('div');
                div.className = 'recipe-item';
                const name = getDisplayName(recipe.result);
                const costs = Object.entries(recipe.cost).map(([k, v]) => `${v} ${getDisplayName(k)}`).join(', ');
                div.innerHTML = `<div class="recipe-info"><div class="icon-${recipe.result}" style="transform:scale(0.6)"></div> ${name}</div><div style="font-size:10px; color:#666">Costs: ${costs}</div>`;
                div.title = `Craft ${name} — Requires: ${costs}`;
                div.addEventListener('click', () => craftItem(recipe));
                list.appendChild(div);
            });
            document.getElementById('craft-window').style.display = 'block';
        }

        function craftItem(recipe) {
            // Check costs
            for (const [key, val] of Object.entries(recipe.cost)) {
                let total = inventorySlots.reduce((acc, s) => (s && s.type === key) ? acc + s.count : acc, 0);
                if (total < val) return;
            }
            // Deduct costs
            for (const [key, val] of Object.entries(recipe.cost)) {
                let remaining = val;
                for (let i = 0; i < 16; i++) {
                    if (inventorySlots[i] && inventorySlots[i].type === key) {
                        const take = Math.min(inventorySlots[i].count, remaining);
                        inventorySlots[i].count -= take;
                        remaining -= take;
                        if (inventorySlots[i].count <= 0) inventorySlots[i] = null;
                        if (remaining <= 0) break;
                    }
                }
            }
            // Add result: stack or new slot
            let placed = false;
            for (let i = 0; i < 16; i++) {
                if (inventorySlots[i] && inventorySlots[i].type === recipe.result) {
                    inventorySlots[i].count++;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                for (let i = 0; i < 16; i++) {
                    if (!inventorySlots[i]) {
                        inventorySlots[i] = { type: recipe.result, count: 1 };
                        placed = true;
                        break;
                    }
                }
            }
            playSfx(1000, 'sine', 0.2, 0.2);
            updateUI();
        }

        /* ===== UPDATE UI ===== */
        function updateUI() {
            // Health bar
            document.getElementById('player-hp-bar').style.width = playerStats.hp + '%';

            // Inventory slots 0-15
            for (let i = 0; i < 16; i++) {
                const domSlots = [document.getElementById(`slot-${i}`)];
                if (i < 4) domSlots.push(document.getElementById(`pocket-${i}`));
                // Map pocket slots 0-2 to toolbar ACT slots (toolbar-slot-1, -2, -3)
                if (i < 3) domSlots.push(document.getElementById(`toolbar-slot-${i + 1}`));

                domSlots.forEach(s => {
                    if (!s) return;
                    const isLocked = (i < 4 && !equipmentSlots.legs) || (i >= 4 && !equipmentSlots.back);
                    s.classList.toggle('disabled', isLocked);
                    // Preserve toolbar labels
                    const existingLabel = s.querySelector('.toolbar-label');
                    s.innerHTML = '';
                    if (existingLabel) s.appendChild(existingLabel);

                    const item = inventorySlots[i];
                    if (item) {
                        const name = getDisplayName(item.type);
                        const icon = document.createElement('div');
                        icon.className = `icon-${item.type}`;
                        s.title = name;
                        const count = document.createElement('div');
                        count.className = 'item-count';
                        count.textContent = item.count;
                        const label = document.createElement('div');
                        label.className = 'item-label';
                        label.textContent = name;
                        s.appendChild(icon);
                        s.appendChild(count);
                        s.appendChild(label);
                    } else {
                        s.title = '';
                    }
                });
            }

            // Toolbar hand slots (slot-0=L-HAND, slot-4=R-HAND)
            [['lhand', 'toolbar-slot-0', 'L-HAND'], ['rhand', 'toolbar-slot-4', 'R-HAND']].forEach(([slot, domId, labelText]) => {
                const s = document.getElementById(domId);
                if (!s) return;
                s.innerHTML = `<div class="toolbar-label">${labelText}</div>`;
                if (equipmentSlots[slot]) {
                    const name = getDisplayName(equipmentSlots[slot].type);
                    const icon = document.createElement('div');
                    icon.className = `icon-${equipmentSlots[slot].type}`;
                    s.title = name;
                    const label = document.createElement('div');
                    label.className = 'item-label';
                    label.textContent = name;
                    s.appendChild(icon);
                    s.appendChild(label);
                } else {
                    s.title = '';
                }
            });

            // Equipment paper doll slots
            ['back', 'armor', 'lhand', 'rhand', 'head', 'torso', 'legs', 'feet'].forEach(slot => {
                const el = document.getElementById(`slot-${slot}`);
                if (!el) return;
                el.innerHTML = '';
                if (equipmentSlots[slot]) {
                    const name = getDisplayName(equipmentSlots[slot].type);
                    const icon = document.createElement('div');
                    icon.className = `icon-${equipmentSlots[slot].type}`;
                    el.title = name;
                    const label = document.createElement('div');
                    label.className = 'item-label';
                    label.textContent = name;
                    el.appendChild(icon);
                    el.appendChild(label);
                } else {
                    el.title = '';
                }
            });

            // 3D hand weapon models
            const updateHand = (slot, model) => {
                if (!model) return;
                while (model.children.length > 0) model.remove(model.children[0]);
                const item = equipmentSlots[slot];
                if (item) {
                    let geo = null;
                    const mat = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
                    if (item.type === 'StoneAxe') {
                        geo = new THREE.CylinderGeometry(0.1, 0.2, 5);
                    } else if (item.type === 'PointyStick') {
                        geo = new THREE.CylinderGeometry(0.05, 0.05, 8);
                    } else if (item.type === 'Torch') {
                        geo = new THREE.CylinderGeometry(0.15, 0.15, 4);
                        const fireMesh = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
                        fireMesh.position.y = 2;
                        model.add(fireMesh);
                        const fireLight = new THREE.PointLight(0xffaa00, 100, 50);
                        fireLight.position.y = 2;
                        model.add(fireLight);
                    }
                    if (geo) {
                        const weaponMesh = new THREE.Mesh(geo, mat);
                        weaponMesh.rotation.x = Math.PI / 2;
                        model.add(weaponMesh);
                        model.visible = true;
                    }
                } else {
                    model.visible = false;
                }
            };
            if (leftWeapon && rightWeapon) {
                updateHand('lhand', leftWeapon);
                updateHand('rhand', rightWeapon);
            }

            // Storage box contents
            const bxw = document.getElementById('box-window');
            if (openBoxId && placedBoxes[openBoxId]) {
                for (let i = 0; i < 24; i++) {
                    const s = document.getElementById(`slot-${i + 16}`);
                    if (!s) continue;
                    s.innerHTML = '';
                    const item = placedBoxes[openBoxId][i];
                    if (item) {
                        const name = getDisplayName(item.type);
                        const icon = document.createElement('div');
                        icon.className = `icon-${item.type}`;
                        s.title = name;
                        const count = document.createElement('div');
                        count.className = 'item-count';
                        count.textContent = item.count;
                        const label = document.createElement('div');
                        label.className = 'item-label';
                        label.textContent = name;
                        s.appendChild(icon);
                        s.appendChild(count);
                        s.appendChild(label);
                    } else {
                        s.title = '';
                    }
                }
                bxw.style.display = 'block';
            } else {
                if (bxw) bxw.style.display = 'none';
            }

            // Drag icon
            const di = document.getElementById('drag-icon');
            if (heldItem) {
                const name = getDisplayName(heldItem.type);
                di.className = `icon-${heldItem.type}`;
                di.title = name;
                di.style.display = 'block';
            } else {
                di.style.display = 'none';
                di.title = '';
            }
        }

        /* ===== DRAGGABLE WINDOWS ===== */
        let dragTarget = null;
        const dragOffset = { x: 0, y: 0 };
        let topZ = 10000;

        document.addEventListener('mousedown', (e) => {
            const win = e.target.closest('.draggable');
            if (win) win.style.zIndex = ++topZ;
            const header = e.target.closest('.win-header');
            if (header && !e.target.classList.contains('win-close')) {
                dragTarget = header.parentElement;
                const rect = dragTarget.getBoundingClientRect();
                
                if (dragTarget.style.bottom) {
                    dragTarget.style.top = rect.top + 'px';
                    dragTarget.style.bottom = '';
                }
                if (dragTarget.style.right) {
                    dragTarget.style.left = rect.left + 'px';
                    dragTarget.style.right = '';
                }

                dragOffset.x = e.clientX - rect.left;
                dragOffset.y = e.clientY - rect.top;
            }
        });
        document.addEventListener('mousemove', (e) => {
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            
            if (dragTarget) {
                if (dragTarget.style.transform === 'none') {
                    dragTarget.style.left = (e.clientX - dragOffset.x) + 'px';
                    dragTarget.style.top = (e.clientY - dragOffset.y) + 'px';
                } else {
                    dragTarget.style.left = (e.clientX - dragOffset.x + dragTarget.offsetWidth / 2) + 'px';
                    dragTarget.style.top = (e.clientY - dragOffset.y + dragTarget.offsetHeight / 2) + 'px';
                }
            }
            if (heldItem) {
                const di = document.getElementById('drag-icon');
                di.style.left = (e.clientX - 30) + 'px';
                di.style.top = (e.clientY - 30) + 'px';
            }
        });
        document.addEventListener('mouseup', () => { dragTarget = null; });
        document.addEventListener('contextmenu', (e) => e.preventDefault());

        // Drop held item into the 3D world
        document.addEventListener('pointerup', (e) => {
            if (e.target.closest('.slot') || e.target.closest('.equip-slot') || e.target.closest('#main-menu') || e.target.closest('.win-close') || e.target.closest('.win-header') || e.target.closest('.draggable')) return;
            if (heldItem && controls && document.getElementById('main-menu').style.display === 'none') {
                const pos = controls.getObject().position;
                const dir = new THREE.Vector3();
                camera.getWorldDirection(dir);
                const spawnX = pos.x + dir.x * 10;
                const spawnZ = pos.z + dir.z * 10;
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshPhongMaterial({ color: 0x8b4513 }));
                mesh.position.set(spawnX, Math.max(getElevation(spawnX, spawnZ), -2) + 1, spawnZ);
                mesh.itemType = heldItem.type;
                mesh.boxId = heldItem.boxId;
                mesh.castShadow = true;
                scene.add(mesh);
                objects.push(mesh);
                heldItem = null;
                updateUI();
            }
        });

        /* ===== INTERACT (E key) ===== */
        function toggleDoor(obj) {
            if (obj.userData.isOpen) {
                obj.children[0].rotation.y = 0;
                obj.userData.isOpen = false;
            } else {
                const localPos = obj.worldToLocal(controls.getObject().position.clone());
                // Rotate hinge to swing toward the player
                obj.children[0].rotation.y = localPos.z < 0 ? Math.PI / 2 : -Math.PI / 2;
                obj.userData.isOpen = true;
            }
            playSfx(350, 'sine', 0.15, 0.15);
        }

        /* ===== INTERACTION & PICKUP ===== */
        let isHoldingE = false;
        let holdTimer = 0;
        let currentInteractTarget = null;

        function getInteractTarget() {
            if (!controls || document.getElementById('main-menu').style.display !== 'none') return null;
            const dir = new THREE.Vector3();
            camera.getWorldDirection(dir);
            const hitRay = new THREE.Raycaster(camera.position, dir, 0, 45);
            const hits = hitRay.intersectObjects(objects, true);
            if (hits.length > 0) {
                let target = hits[0].object;
                while (target.parent && target.parent.type !== 'Scene') {
                    if (target.itemType) return target;
                    target = target.parent;
                }
                if (target.itemType) return target;
            }
            return null;
        }

        function shortInteract(obj) {
            if (obj.itemType === 'WoodDoor' && obj.userData) {
                toggleDoor(obj);
            } else if (obj.boxId && obj.itemType === 'StorageBox') {
                openBoxId = obj.boxId;
                controls.unlock();
                updateUI();
            } else if (obj.stationType) {
                openStationType = obj.stationType;
                controls.unlock();
                showCrafting(obj.stationType);
            }
        }

        function pickUpItem(obj) {
            const type = obj.itemType;
            let placed = false;
            const unstackable = UNSTACKABLE_ITEMS;

            if (unstackable.includes(type)) {
                for (let i = 0; i < 16; i++) {
                    if (!inventorySlots[i]) {
                        inventorySlots[i] = { type, count: 1, boxId: obj.boxId };
                        placed = true;
                        break;
                    }
                }
            } else {
                for (let i = 0; i < 16; i++) {
                    if (inventorySlots[i] && inventorySlots[i].type === type) {
                        inventorySlots[i].count++;
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    for (let i = 0; i < 16; i++) {
                        if (!inventorySlots[i]) {
                            inventorySlots[i] = { type, count: 1 };
                            placed = true;
                            break;
                        }
                    }
                }
            }

            if (placed) {
                scene.remove(obj);
                const idx = objects.indexOf(obj);
                if (idx > -1) objects.splice(idx, 1);
                playSfx(400, 'sine', 0.1, 0.1);
                updateUI();
            } else {
                playSfx(100, 'square', 0.1, 0.1); // Inventory full
            }
        }

        function checkCollision(playerBox) {
            let isHit = false;
            const playerCenter = new THREE.Vector3();
            playerBox.getCenter(playerCenter);

            for (const obj of objects) {
                if (!obj.itemType) continue;
                if (obj.position.distanceToSquared(playerCenter) > 900) continue;
                if (obj.itemType === 'Shrub' || obj.itemType === 'Leaves') continue; // Non-solid

                obj.traverse(child => {
                    if (isHit) return;
                    if (child.isMesh) {
                        const childBox = new THREE.Box3().setFromObject(child);
                        if (playerBox.intersectsBox(childBox)) isHit = true;
                    }
                });
                if (isHit) return true;
            }
            // Check boars
            for (const boar of boars) {
                if (boar.group.position.distanceToSquared(playerCenter) > 900) continue;
                boar.group.traverse(child => {
                    if (isHit) return;
                    if (child.isMesh) {
                        const childBox = new THREE.Box3().setFromObject(child);
                        if (playerBox.intersectsBox(childBox)) isHit = true;
                    }
                });
                if (isHit) return true;
            }
            return false;
        }

        function getGroundY(px, pz, currentY) {
            let maxGround = getElevation(px, pz) + 10; // Default floor camera height follows terrain
            const radius = 1.0;
            const playerFootBox = new THREE.Box3(
                new THREE.Vector3(px - radius, 0, pz - radius),
                new THREE.Vector3(px + radius, currentY - 7.5, pz + radius)
            );
            
            for (const obj of objects) {
                if (!obj.itemType) continue;
                if (obj.position.distanceToSquared(new THREE.Vector3(px, currentY, pz)) > 900) continue;
                if (['Shrub', 'Leaves', 'WoodDoorway', 'WoodDoor'].includes(obj.itemType)) continue;

                obj.traverse(child => {
                    if (child.isMesh) {
                        const childBox = new THREE.Box3().setFromObject(child);
                        if (playerFootBox.intersectsBox(childBox)) {
                            const surfaceCameraY = childBox.max.y + 10;
                            if (surfaceCameraY > maxGround && surfaceCameraY <= currentY + 2.5) {
                                maxGround = surfaceCameraY;
                            }
                        }
                    }
                });
            }
            return maxGround;
        }

        /* ===== USE ACTION SLOT (keys 1-3) ===== */
        const placeableItems = PLACEABLE_ITEMS;
        let nextBoxId = 1;
        let placingType = null;   // item type being placed
        let placingSlotIdx = -1;  // inventory slot index of item being placed

        function cancelPlacement() {
            if (ghostMesh) {
                scene.remove(ghostMesh);
                ghostMesh = null;
            }
            placingType = null;
            placingSlotIdx = -1;
            document.getElementById('place-ui').style.display = 'none';
            document.getElementById('crosshair').style.borderColor = 'white';
        }

        function createGhostMesh(type) {
            let geo, color;
            if (type === 'WoodFoundation')    { geo = new THREE.BoxGeometry(20, 2, 20);  color = 0x8b4513; }
            else if (type === 'WoodWall')     { geo = new THREE.BoxGeometry(20, 20, 2);  color = 0x8b4513; }
            else if (type === 'WoodRoof')     { geo = new THREE.BoxGeometry(20, 2, 20);  color = 0xa0522d; }
            else if (type === 'Campfire')     { geo = new THREE.BoxGeometry(6, 2, 6);    color = 0x8b4513; }
            else if (type === 'Workbench')    { geo = new THREE.BoxGeometry(6, 2, 6);    color = 0x5d2e0a; }
            else if (type === 'StorageBox')   { geo = new THREE.BoxGeometry(6, 6, 6);    color = 0x6d3b1a; }
            else if (type === 'WoodDoorway')  { return createDoorwayGhost(); }
            else if (type === 'WoodDoor')     { return createDoorGhost(); }
            else return null;

            const mat = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.name = type;
            mesh.visible = false;
            return mesh;
        }

        function createDoorGhost() {
            const container = new THREE.Group();
            const pivot = new THREE.Group();
            pivot.position.set(-4, 0, 0);
            const mat = new THREE.MeshPhongMaterial({ color: 0xa0522d, transparent: true, opacity: 0.45, depthWrite: false });
            const panel = new THREE.Mesh(new THREE.BoxGeometry(8, 16, 0.8), mat);
            panel.position.set(4, 0, 0);
            pivot.add(panel);
            container.add(pivot);
            container.name = 'WoodDoor';
            container.visible = false;
            return container;
        }

        function createDoorwayGhost() {
            const group = new THREE.Group();
            const mat = new THREE.MeshPhongMaterial({ color: 0x8b4513, transparent: true, opacity: 0.45, depthWrite: false });
            // Left pillar
            const left = new THREE.Mesh(new THREE.BoxGeometry(6, 20, 2), mat);
            left.position.set(-7, 0, 0);
            group.add(left);
            // Right pillar
            const right = new THREE.Mesh(new THREE.BoxGeometry(6, 20, 2), mat);
            right.position.set(7, 0, 0);
            group.add(right);
            // Top beam (lintel)
            const top = new THREE.Mesh(new THREE.BoxGeometry(20, 4, 2), mat);
            top.position.set(0, 8, 0);
            group.add(top);
            group.name = 'WoodDoorway';
            group.visible = false;
            return group;
        }

        function buildDoorwayMesh() {
            const group = new THREE.Group();
            const mat = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
            const left = new THREE.Mesh(new THREE.BoxGeometry(6, 20, 2), mat);
            left.position.set(-7, 0, 0); left.castShadow = true;
            group.add(left);
            const right = new THREE.Mesh(new THREE.BoxGeometry(6, 20, 2), mat);
            right.position.set(7, 0, 0); right.castShadow = true;
            group.add(right);
            const top = new THREE.Mesh(new THREE.BoxGeometry(20, 4, 2), mat);
            top.position.set(0, 8, 0); top.castShadow = true;
            group.add(top);
            return group;
        }

        function buildDoorMesh() {
            // Container sits at the center of the doorway
            const container = new THREE.Group();
            
            // Pivot sits at the left edge of the doorway hole
            const pivot = new THREE.Group();
            pivot.position.set(-4, 0, 0); // Inner edge of the left pillar
            
            // Panel spans from pivot to the right
            const panel = new THREE.Mesh(
                new THREE.BoxGeometry(8, 16, 0.8),
                new THREE.MeshPhongMaterial({ color: 0xa0522d })
            );
            panel.position.set(4, 0, 0);  // Center of the panel is 4 units from the pivot
            panel.castShadow = true;
            pivot.add(panel);
            
            // Handle (front)
            const handle = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 1.5, 1.5),
                new THREE.MeshPhongMaterial({ color: 0xffd700 })
            );
            handle.position.set(6.5, 0, 0.8);
            pivot.add(handle);
            
            // Handle (back)
            const handleBack = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 1.5, 1.5),
                new THREE.MeshPhongMaterial({ color: 0xffd700 })
            );
            handleBack.position.set(6.5, 0, -0.8);
            pivot.add(handleBack);
            
            // Interaction logic will rotate the pivot
            container.add(pivot);
            container.userData.isDoorContainer = true;
            container.userData.isOpen = false;
            
            return container;
        }

        function useActionSlot(pocketIdx) {
            if (!controls || document.getElementById('main-menu').style.display !== 'none') return;
            const item = inventorySlots[pocketIdx];
            if (!item) return;

            // Consumable: eat cooked meat
            if (item.type === 'CookedMeat') {
                playerStats.heal(30);
                playSfx(600, 'sine', 0.2, 0.15);
                item.count--;
                if (item.count <= 0) inventorySlots[pocketIdx] = null;
                updateUI();
                return;
            }

            // Torch: equip to left hand if empty, otherwise right hand
            if (item.type === 'Torch') {
                const target = !equipmentSlots.lhand ? 'lhand' : !equipmentSlots.rhand ? 'rhand' : null;
                if (target) {
                    equipmentSlots[target] = { type: 'Torch', count: 1 };
                    item.count--;
                    if (item.count <= 0) inventorySlots[pocketIdx] = null;
                    playSfx(500, 'sine', 0.15, 0.1);
                    updateUI();
                }
                return;
            }

            // Placeable items: enter placement mode (or cancel if already placing same type)
            if (placeableItems.includes(item.type)) {
                // Toggle off if already placing this item
                if (placingType === item.type && placingSlotIdx === pocketIdx) {
                    cancelPlacement();
                    return;
                }
                // Cancel any existing placement first
                cancelPlacement();

                // Create ghost and enter placement mode
                ghostMesh = createGhostMesh(item.type);
                if (ghostMesh) {
                    scene.add(ghostMesh);
                    placingType = item.type;
                    placingSlotIdx = pocketIdx;
                    playSfx(400, 'sine', 0.1, 0.1);
                    document.getElementById('place-ui').style.display = 'block';
                    document.getElementById('crosshair').style.borderColor = '#ffd700';
                }
                return;
            }
        }

        function confirmPlacement() {
            if (!ghostMesh || !placingType || !ghostMesh.visible) return;

            const type = placingType;
            const slotIdx = placingSlotIdx;
            const pos = ghostMesh.position.clone();
            const rot = ghostMesh.rotation.clone();

            // Remove ghost
            cancelPlacement();

            // Build the real mesh at the ghost position
            let mesh;

            if (type === 'WoodFoundation') {
                mesh = new THREE.Mesh(new THREE.BoxGeometry(20, 2, 20), new THREE.MeshPhongMaterial({ color: 0x8b4513 }));
            } else if (type === 'WoodWall') {
                mesh = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 2), new THREE.MeshPhongMaterial({ color: 0x8b4513 }));
            } else if (type === 'WoodRoof') {
                mesh = new THREE.Mesh(new THREE.BoxGeometry(20, 2, 20), new THREE.MeshPhongMaterial({ color: 0xa0522d }));
            } else if (type === 'WoodDoorway') {
                mesh = buildDoorwayMesh();
            } else if (type === 'WoodDoor') {
                mesh = buildDoorMesh();
            } else if (type === 'Campfire') {
                mesh = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 6), new THREE.MeshPhongMaterial({ color: 0x8b4513 }));
                const fireBall = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff4500 }));
                fireBall.position.y = 2;
                mesh.add(fireBall);
                const fireLight = new THREE.PointLight(0xff4500, 50, 40);
                fireLight.position.y = 3;
                mesh.add(fireLight);
                mesh.stationType = 'Campfire';
            } else if (type === 'Workbench') {
                mesh = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 6), new THREE.MeshPhongMaterial({ color: 0x5d2e0a }));
                const top = new THREE.Mesh(new THREE.BoxGeometry(8, 1, 4), new THREE.MeshPhongMaterial({ color: 0x8b4513 }));
                top.position.y = 1.5;
                mesh.add(top);
                mesh.stationType = 'Workbench';
            } else if (type === 'StorageBox') {
                mesh = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), new THREE.MeshPhongMaterial({ color: 0x6d3b1a }));
                const lid = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.2, 6.5), new THREE.MeshPhongMaterial({ color: 0x3d210e }));
                lid.position.y = 3;
                mesh.add(lid);
                const boxId = 'box_' + nextBoxId++;
                mesh.boxId = boxId;
                placedBoxes[boxId] = new Array(24).fill(null);
            }

            if (!mesh) return;

            mesh.position.copy(pos);
            mesh.rotation.copy(rot);
            mesh.itemType = type;
            mesh.castShadow = true;
            scene.add(mesh);
            objects.push(mesh);

            // Consume item from inventory
            if (inventorySlots[slotIdx]) {
                inventorySlots[slotIdx].count--;
                if (inventorySlots[slotIdx].count <= 0) inventorySlots[slotIdx] = null;
            }

            playSfx(300, 'sine', 0.15, 0.15);
            updateUI();
        }

        /* ===== COMBAT HIT CHECK ===== */
        function checkCombatHit() {
            const dir = new THREE.Vector3();
            camera.getWorldDirection(dir);
            const hitRay = new THREE.Raycaster(camera.position, dir, 0, 15);

            // Check hitting trees/rocks
            const hits = hitRay.intersectObjects(objects, true);
            if (hits.length > 0) {
                const target = hits[0].object;
                if (target.itemType === 'Wood' || target.itemType === 'Leaves') {
                    // Add wood to inventory
                    for (let i = 0; i < 16; i++) {
                        if (inventorySlots[i] && inventorySlots[i].type === 'Wood') {
                            inventorySlots[i].count += 2;
                            updateUI();
                            playSfx(400, 'square', 0.1, 0.1);
                            return;
                        }
                    }
                    for (let i = 0; i < 16; i++) {
                        if (!inventorySlots[i]) {
                            inventorySlots[i] = { type: 'Wood', count: 2 };
                            updateUI();
                            playSfx(400, 'square', 0.1, 0.1);
                            return;
                        }
                    }
                }
                if (target.itemType === 'Rock') {
                    for (let i = 0; i < 16; i++) {
                        if (inventorySlots[i] && inventorySlots[i].type === 'Rock') {
                            inventorySlots[i].count++;
                            updateUI();
                            playSfx(300, 'square', 0.1, 0.1);
                            return;
                        }
                    }
                    for (let i = 0; i < 16; i++) {
                        if (!inventorySlots[i]) {
                            inventorySlots[i] = { type: 'Rock', count: 1 };
                            updateUI();
                            playSfx(300, 'square', 0.1, 0.1);
                            return;
                        }
                    }
                }
            }

            // Check hitting boars
            for (let i = boars.length - 1; i >= 0; i--) {
                if (hitRay.intersectObject(boars[i].group, true).length > 0) {
                    if (boars[i].takeDamage()) {
                        boars.splice(i, 1);
                        document.getElementById('boar-ui').innerText = "Slain!";
                    }
                    break;
                }
            }
        }

        /* ===== SPAWN SYSTEM ===== */
        function countWorldObjects(type) {
            if (type === 'Tree') return objects.filter(o => o.itemType === 'Wood').length;
            if (type === 'Rock') return objects.filter(o => o.itemType === 'Rock').length;
            if (type === 'Shrub') return objects.filter(o => o.itemType === 'Shrub').length;
            if (type === 'Boar') return boars.length;
            return 0;
        }

        function getValidSpawn() {
            for (let i = 0; i < 20; i++) {
                const x = Math.random() * 1800 - 900;
                const z = Math.random() * 1800 - 900;
                const elev = getElevation(x, z);
                if (elev >= -2) return { x, z, elev };
            }
            return null;
        }

        function spawnTree() {
            const spawn = getValidSpawn();
            if (!spawn) return;
            const { x, z, elev } = spawn;
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(1, 1.5, 10, 8),
                new THREE.MeshPhongMaterial({ color: 0x4d2911 })
            );
            trunk.position.set(x, elev + 5, z);
            trunk.itemType = 'Wood';
            trunk.castShadow = true;
            scene.add(trunk);
            objects.push(trunk);

            const foliage = new THREE.Mesh(
                new THREE.DodecahedronGeometry(5),
                new THREE.MeshPhongMaterial({ color: 0x114d11 })
            );
            foliage.position.set(x, elev + 12, z);
            foliage.castShadow = true;
            foliage.itemType = 'Leaves';
            scene.add(foliage);
            objects.push(foliage);
        }

        function spawnRock() {
            const spawn = getValidSpawn();
            if (!spawn) return;
            const { x, z, elev } = spawn;
            const mesh = new THREE.Mesh(
                new THREE.DodecahedronGeometry(3),
                new THREE.MeshPhongMaterial({ color: 0x888888, flatShading: true })
            );
            const s = Math.random() * 2 + 0.5;
            mesh.scale.set(s, s * 0.7, s);
            mesh.position.set(x, elev + s, z);
            mesh.rotation.set(Math.random(), Math.random(), Math.random());
            mesh.itemType = 'Rock';
            mesh.castShadow = true;
            scene.add(mesh);
            objects.push(mesh);
        }

        function spawnShrub() {
            const spawn = getValidSpawn();
            if (!spawn) return;
            const { x, z, elev } = spawn;
            const mesh = new THREE.Mesh(
                new THREE.DodecahedronGeometry(2),
                new THREE.MeshPhongMaterial({ color: 0x228b22 })
            );
            mesh.position.set(x, elev + 1, z);
            mesh.scale.set(Math.random() + 0.5, Math.random() + 0.5, Math.random() + 0.5);
            mesh.itemType = 'Shrub';
            mesh.castShadow = true;
            scene.add(mesh);
            objects.push(mesh);
        }

        function spawnBoar() {
            boars.push(new Boar());
        }

        function updateSpawns(delta) {
            for (const [type, cfg] of Object.entries(spawnConfig)) {
                cfg.current = countWorldObjects(type);
                if (cfg.current < cfg.maxCount) {
                    cfg.timer += delta;
                    if (cfg.timer >= cfg.respawnTime) {
                        cfg.timer = 0;
                        if (type === 'Tree') spawnTree();
                        else if (type === 'Rock') spawnRock();
                        else if (type === 'Shrub') spawnShrub();
                        else if (type === 'Boar') spawnBoar();
                    }
                } else {
                    cfg.timer = 0;  // reset timer when at cap
                }
            }
        }

        function buildAdminPanel() {
            // === Spawn rate controls ===
            const container = document.getElementById('spawn-controls');
            container.innerHTML = '';
            for (const [type, cfg] of Object.entries(spawnConfig)) {
                const block = document.createElement('div');
                block.className = 'spawn-block';

                const title = document.createElement('div');
                title.className = 'spawn-block-title';
                title.textContent = cfg.label;
                block.appendChild(title);

                // Respawn time slider row
                const timeRow = document.createElement('div');
                timeRow.className = 'spawn-slider-row';
                const timeLbl = document.createElement('span');
                timeLbl.className = 'spawn-label';
                timeLbl.textContent = 'Interval';
                const timeSlider = document.createElement('input');
                timeSlider.type = 'range'; timeSlider.min = '5'; timeSlider.max = '300'; timeSlider.value = cfg.respawnTime;
                const timeVal = document.createElement('span');
                timeVal.className = 'spawn-val';
                timeVal.textContent = cfg.respawnTime + 's';
                timeSlider.addEventListener('input', () => {
                    cfg.respawnTime = parseInt(timeSlider.value);
                    timeVal.textContent = cfg.respawnTime + 's';
                });
                timeRow.appendChild(timeLbl);
                timeRow.appendChild(timeSlider);
                timeRow.appendChild(timeVal);
                block.appendChild(timeRow);

                // Max count slider row
                const capRow = document.createElement('div');
                capRow.className = 'spawn-slider-row';
                const capLbl = document.createElement('span');
                capLbl.className = 'spawn-label';
                capLbl.textContent = 'Max Count';
                const capSlider = document.createElement('input');
                capSlider.type = 'range'; capSlider.min = '0'; capSlider.max = '200'; capSlider.value = cfg.maxCount;
                const capVal = document.createElement('span');
                capVal.className = 'spawn-val';
                capVal.textContent = cfg.maxCount;
                capSlider.addEventListener('input', () => {
                    cfg.maxCount = parseInt(capSlider.value);
                    capVal.textContent = cfg.maxCount;
                });
                capRow.appendChild(capLbl);
                capRow.appendChild(capSlider);
                capRow.appendChild(capVal);
                block.appendChild(capRow);

                container.appendChild(block);
            }

            // === Give item dropdown ===
            const select = document.getElementById('give-item-select');
            select.innerHTML = '';
            for (const [key, name] of Object.entries(itemDisplayNames)) {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = name;
                select.appendChild(opt);
            }
        }

        function giveItem() {
            const type = document.getElementById('give-item-select').value;
            const count = Math.max(1, Math.min(999, parseInt(document.getElementById('give-item-count').value) || 1));
            const name = getDisplayName(type);
            const feedback = document.getElementById('give-feedback');
            const unstackable = UNSTACKABLE_ITEMS;

            let given = 0;
            if (unstackable.includes(type)) {
                // Each one takes its own slot
                for (let n = 0; n < count; n++) {
                    for (let i = 0; i < 16; i++) {
                        if (!inventorySlots[i]) {
                            inventorySlots[i] = { type, count: 1 };
                            given++;
                            break;
                        }
                    }
                }
            } else {
                // Stackable: try to stack first, then new slot
                let remaining = count;
                for (let i = 0; i < 16; i++) {
                    if (inventorySlots[i] && inventorySlots[i].type === type) {
                        inventorySlots[i].count += remaining;
                        given = count;
                        remaining = 0;
                        break;
                    }
                }
                if (remaining > 0) {
                    for (let i = 0; i < 16; i++) {
                        if (!inventorySlots[i]) {
                            inventorySlots[i] = { type, count: remaining };
                            given = count;
                            remaining = 0;
                            break;
                        }
                    }
                }
            }

            updateUI();
            if (given > 0) {
                feedback.style.color = '#66ff66';
                feedback.textContent = `✔ Gave ${given}x ${name}`;
            } else {
                feedback.style.color = '#ff4444';
                feedback.textContent = `✘ No inventory space!`;
            }
            setTimeout(() => { feedback.textContent = ''; }, 3000);
        }

        /* ===== INIT ===== */
        function init() {
            // Renderer first (ensures canvas exists even if later steps fail)
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.shadowMap.enabled = true;
            document.body.appendChild(renderer.domElement);

            // Scene
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x87ceeb);

            // Camera
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 15000);
            camera.position.y = getElevation(0, 0) + 10;

            // Lighting — NO default player light; torch must be crafted
            const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
            dirLight.position.set(500, 1000, 500);
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.set(2048, 2048);
            scene.add(dirLight);
            scene.add(new THREE.AmbientLight(0xffffff, 0.4));

            // Skydome with Sun & Moving Clouds Haze
            skyUniforms = {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0xdceeff) },
                sunColor: { value: new THREE.Color(0xffffee) },
                sunPosition: { value: dirLight.position.clone().normalize() },
                time: { value: 0.0 }
            };

            const skyVertexShader = `
                varying vec3 vPos;
                void main() {
                    vPos = (modelMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `;

            const skyFragmentShader = `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform vec3 sunColor;
                uniform vec3 sunPosition;
                uniform float time;
                varying vec3 vPos;

                float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123); }
                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    vec2 u = f * f * (3.0 - 2.0 * f);
                    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
                }
                float fbm(vec2 p) {
                    float f = 0.0, a = 0.5;
                    for(int i=0; i<4; i++) { f += a * noise(p); p *= 2.0; a *= 0.5; }
                    return f;
                }

                void main() {
                    vec3 dir = normalize(vPos);
                    float h = max(dir.y, 0.0);
                    
                    // Base sky gradient
                    vec3 sky = mix(bottomColor, topColor, pow(h, 0.6));
                    
                    // Sun rendering
                    float sunDist = distance(dir, sunPosition);
                    float sunDisk = smoothstep(0.03, 0.02, sunDist);
                    float sunGlow = smoothstep(0.3, 0.0, sunDist);
                    sky += sunColor * (sunDisk + sunGlow * 0.5);

                    // Haze and Moving Clouds Layer
                    if (dir.y > 0.01) {
                        vec2 uv = dir.xz / (dir.y + 0.15);
                        uv.x += time * 0.01;
                        
                        float n = fbm(uv * 2.0);
                        
                        float haze = smoothstep(0.2, 0.6, n) * 0.4;
                        float clouds = smoothstep(0.5, 0.8, n) * 0.8;
                        float totalAlpha = clamp(haze + clouds, 0.0, 1.0);
                        
                        float horizonFade = smoothstep(0.01, 0.2, dir.y);
                        totalAlpha *= horizonFade;
                        
                        vec3 cloudTint = mix(vec3(1.0), sunColor, sunGlow * 0.8);
                        sky = mix(sky, cloudTint, totalAlpha);
                    }
                    
                    gl_FragColor = vec4(sky, 1.0);
                }
            `;

            const skydome = new THREE.Mesh(
                new THREE.SphereGeometry(10000, 32, 32),
                new THREE.ShaderMaterial({
                    uniforms: skyUniforms,
                    vertexShader: skyVertexShader,
                    fragmentShader: skyFragmentShader,
                    side: THREE.BackSide
                })
            );
            scene.add(skydome);

            // Camera-attached weapon models
            leftWeapon = new THREE.Group();
            leftWeapon.position.set(-1.5, -1.5, -3);
            camera.add(leftWeapon);
            rightWeapon = new THREE.Group();
            rightWeapon.position.set(1.5, -1.5, -3);
            camera.add(rightWeapon);
            scene.add(camera);

            // Ground with grass texture
            const grassTex = new THREE.TextureLoader().load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
            grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
            grassTex.repeat.set(50, 50);
            
            const floorGeo = new THREE.PlaneGeometry(2000, 2000, 100, 100);
            floorGeo.rotateX(-Math.PI / 2);
            
            const posAttr = floorGeo.attributes.position;
            for (let i = 0; i < posAttr.count; i++) {
                const x = posAttr.getX(i);
                const z = posAttr.getZ(i);
                posAttr.setY(i, getElevation(x, z));
            }
            floorGeo.computeVertexNormals();
            
            floorMesh = new THREE.Mesh(
                floorGeo,
                new THREE.MeshPhongMaterial({ map: grassTex })
            );
            floorMesh.receiveShadow = true;
            scene.add(floorMesh);

            // Water
            const waterGeo = new THREE.PlaneGeometry(2000, 2000);
            waterGeo.rotateX(-Math.PI / 2);
            const waterMat = new THREE.MeshPhongMaterial({ color: 0x1e90ff, transparent: true, opacity: 0.6 });
            const waterMesh = new THREE.Mesh(waterGeo, waterMat);
            waterMesh.position.y = -2;
            scene.add(waterMesh);

            // 3D Grass Cover
            const grassGeo = new THREE.BufferGeometry();
            const grassVerts = [];
            const numBlades = 3; // 3 blades per clump = 9 vertices = 3 triangles
            for (let j = 0; j < numBlades; j++) {
                const angle = (j / numBlades) * Math.PI * 2;
                const width = 0.15 + Math.random() * 0.1;
                const height = 0.8 + Math.random() * 0.8;
                const tilt = 0.2 + Math.random() * 0.3;
                
                const x1 = Math.cos(angle) * width, z1 = Math.sin(angle) * width;
                const x2 = Math.cos(angle + Math.PI) * width, z2 = Math.sin(angle + Math.PI) * width;
                const tipX = Math.cos(angle + Math.PI/2) * tilt * height;
                const tipZ = Math.sin(angle + Math.PI/2) * tilt * height;
                
                grassVerts.push(x1, 0, z1, x2, 0, z2, tipX, height, tipZ);
            }
            grassGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(grassVerts), 3));
            grassGeo.computeVertexNormals();

            const grassMat = new THREE.MeshPhongMaterial({ color: 0x3b8e23, side: THREE.DoubleSide });
            grassMat.onBeforeCompile = (shader) => {
                shader.uniforms.time = skyUniforms.time;
                shader.vertexShader = `uniform float time;\n` + shader.vertexShader;
                shader.vertexShader = shader.vertexShader.replace(
                    `#include <begin_vertex>`,
                    `
                    #include <begin_vertex>
                    float sway = step(0.1, position.y);
                    float phase = instanceMatrix[3][0] * 0.1 + instanceMatrix[3][2] * 0.1;
                    transformed.x += sin(time * 2.0 + phase) * 0.15 * sway * position.y;
                    transformed.z += cos(time * 1.5 + phase) * 0.15 * sway * position.y;
                    `
                );
            };

            const grassCount = 100000;
            const grassInstanced = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
            grassInstanced.receiveShadow = false; // Disable to keep performance buttery smooth
            grassInstanced.castShadow = false;

            const dummyGrass = new THREE.Object3D();
            const gColor = new THREE.Color();
            let validGrass = 0;

            for (let i = 0; i < grassCount; i++) {
                const x = Math.random() * 2000 - 1000;
                const z = Math.random() * 2000 - 1000;
                const y = getElevation(x, z);
                
                // Only spawn on land and lower elevations
                if (y > -1.5 && y < 60) {
                    dummyGrass.position.set(x, y, z);
                    dummyGrass.rotation.y = Math.random() * Math.PI;
                    dummyGrass.scale.setScalar(0.6 + Math.random() * 0.6);
                    dummyGrass.updateMatrix();
                    grassInstanced.setMatrixAt(validGrass, dummyGrass.matrix);
                    
                    // Varying natural greens and yellows
                    const g = 0.35 + Math.random() * 0.3;
                    const r = g * (0.6 + Math.random() * 0.4);
                    gColor.setRGB(r, g, 0.1);
                    grassInstanced.setColorAt(validGrass, gColor);
                    
                    validGrass++;
                }
            }
            grassInstanced.count = validGrass;
            scene.add(grassInstanced);

            // World generation: trees, rocks, shrubs (use spawn functions)
            for (let i = 0; i < 60; i++) spawnTree();
            for (let i = 0; i < 45; i++) spawnRock();
            for (let i = 0; i < 45; i++) spawnShrub();

            // Spawn boars
            for (let i = 0; i < spawnConfig.Boar.maxCount; i++) spawnBoar();

            // Controls
            controls = new PointerLockControls(camera, document.body);
            const menu = document.getElementById('main-menu');
            controls.addEventListener('lock', () => { menu.style.display = 'none'; });
            controls.addEventListener('unlock', () => {
                const windowIds = ['bag-window', 'box-window', 'craft-window', 'equip-window', 'main-menu', 'pockets-window'];
                const anyWindowOpen = windowIds.some(id => {
                    const el = document.getElementById(id);
                    return el && (el.style.display === 'block' || el.style.display === 'flex');
                });
                if (!anyWindowOpen) menu.style.display = 'flex';
            });

            // Raycaster
            raycaster = new THREE.Raycaster();

            // Starting inventory: PointyStick in pocket slot 0, Pants equipped
            inventorySlots[0] = { type: 'PointyStick', count: 1 };
            equipmentSlots.legs = { type: 'Pants', count: 1 };

            // Keyboard input
            document.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
                switch (e.code) {
                    case 'KeyW': moveForward = true; break;
                    case 'KeyS': moveBackward = true; break;
                    case 'KeyA': moveLeft = true; break;
                    case 'KeyD': moveRight = true; break;
                    case 'Space': if (canJump) { velocity.y += 350; canJump = false; } break;
                    case 'KeyE':
                        if (!isHoldingE) {
                            isHoldingE = true;
                            holdTimer = 0;
                            currentInteractTarget = getInteractTarget();
                        }
                        break;
                    case 'KeyI': toggleWindow('equip'); break;
                    case 'KeyC': toggleWindow('craft'); break;
                    case 'KeyB': toggleWindow('bag'); break;
                    case 'KeyP': toggleWindow('pockets'); break;
                    case 'KeyM': toggleWindow('menu'); break;
                    case 'Digit1': useActionSlot(0); break;
                    case 'Digit2': useActionSlot(1); break;
                    case 'Digit3': useActionSlot(2); break;
                    case 'Escape': if (placingType) { cancelPlacement(); playSfx(200, 'square', 0.1, 0.1); } break;
                }
            });
            document.addEventListener('keyup', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
                switch (e.code) {
                    case 'KeyW': moveForward = false; break;
                    case 'KeyS': moveBackward = false; break;
                    case 'KeyA': moveLeft = false; break;
                    case 'KeyD': moveRight = false; break;
                    case 'KeyE':
                        if (isHoldingE) {
                            isHoldingE = false;
                            document.getElementById('pickup-progress-container').style.display = 'none';
                            if (holdTimer < 0.8 && currentInteractTarget) {
                                shortInteract(currentInteractTarget);
                            }
                            holdTimer = 0;
                            currentInteractTarget = null;
                        }
                        break;
                }
            });

            // Mouse click: placement confirm, or dual-hand attack
            document.addEventListener('mousedown', (e) => {
                if (controls.isLocked) {
                    // Left click: confirm placement if in placement mode
                    if (e.button === 0 && ghostMesh && placingType) {
                        confirmPlacement();
                        return;  // don't also attack
                    }
                    // Right click: cancel placement if in placement mode
                    if (e.button === 2 && ghostMesh && placingType) {
                        cancelPlacement();
                        playSfx(200, 'square', 0.1, 0.1);
                        return;
                    }

                    // Click to interact with Door
                    if (e.button === 0 || e.button === 2) {
                        const dir = new THREE.Vector3();
                        camera.getWorldDirection(dir);
                        const hitRay = new THREE.Raycaster(camera.position, dir, 0, 45);
                        const hits = hitRay.intersectObjects(objects, true);
                        if (hits.length > 0) {
                            let target = hits[0].object;
                            while (target.parent && target.parent.type !== 'Scene') {
                                if (target.itemType) break;
                                target = target.parent;
                            }
                            if (target.itemType === 'WoodDoor' && target.userData) {
                                toggleDoor(target);
                                return; // prevent attacking when clicking door
                            }
                        }
                    }

                    // Normal combat
                    const validWeapons = ['StoneAxe', 'PointyStick'];
                    if (e.button === 0 && equipmentSlots.lhand && validWeapons.includes(equipmentSlots.lhand.type)) {
                        leftAttacking = true;
                        lTimer = 0;
                        checkCombatHit();
                    }
                    if (e.button === 2 && equipmentSlots.rhand && validWeapons.includes(equipmentSlots.rhand.type)) {
                        rightAttacking = true;
                        rTimer = 0;
                        checkCombatHit();
                    }
                }
            });

            // Window resize handler
            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });

            // Build UI and render initial state
            initUI();
            updateUI();
        }

        /* ===== ANIMATION LOOP ===== */
        function animate() {
            requestAnimationFrame(animate);
            const time = performance.now();
            const delta = (time - prevTime) / 1000;

            if (skyUniforms) skyUniforms.time.value += delta;

            const isMenuOpen = document.getElementById('main-menu').style.display !== 'none';

            if (controls && !isMenuOpen) {
                // Attack animations
                if (leftAttacking && leftWeapon) {
                    lTimer += delta * 12;
                    leftWeapon.position.z = -3 - Math.sin(lTimer) * 4;
                    if (lTimer >= Math.PI) { leftAttacking = false; leftWeapon.position.z = -3; }
                }
                if (rightAttacking && rightWeapon) {
                    rTimer += delta * 12;
                    rightWeapon.position.z = -3 - Math.sin(rTimer) * 4;
                    if (rTimer >= Math.PI) { rightAttacking = false; rightWeapon.position.z = -3; }
                }

                // Boar AI
                boars.forEach(b => b.update(time, controls.getObject().position));

                // Spawn system
                updateSpawns(delta);

                // Target UI (boar health bar when looking at one)
                const lookDir = new THREE.Vector3();
                camera.getWorldDirection(lookDir);
                const targetRay = new THREE.Raycaster(camera.position, lookDir, 0, 100);
                let foundTarget = false;
                for (const boar of boars) {
                    if (targetRay.intersectObject(boar.group, true).length > 0) {
                        document.getElementById('target-ui').style.display = 'block';
                        document.getElementById('target-hp-bar').style.width = (boar.stats.hp / 5 * 100) + '%';
                        foundTarget = true;
                        break;
                    }
                }
                if (!foundTarget) document.getElementById('target-ui').style.display = 'none';

                // E-Key Holding (Pickup)
                if (isHoldingE && currentInteractTarget) {
                    const currentLookingAt = getInteractTarget();
                    if (currentLookingAt === currentInteractTarget) {
                        holdTimer += delta;
                        document.getElementById('pickup-progress-container').style.display = 'block';
                        document.getElementById('pickup-progress-bar').style.width = Math.min((holdTimer / 0.8) * 100, 100) + '%';
                        
                        if (holdTimer >= 0.8) {
                            pickUpItem(currentInteractTarget);
                            isHoldingE = false;
                            document.getElementById('pickup-progress-container').style.display = 'none';
                        }
                    } else {
                        isHoldingE = false;
                        document.getElementById('pickup-progress-container').style.display = 'none';
                    }
                }

                // Movement physics
                velocity.x -= velocity.x * 10 * delta;
                velocity.z -= velocity.z * 10 * delta;
                velocity.y -= 9.8 * 100 * delta;

                const direction = new THREE.Vector3();
                direction.z = Number(moveForward) - Number(moveBackward);
                direction.x = Number(moveRight) - Number(moveLeft);
                direction.normalize();

                if (moveForward || moveBackward) velocity.z -= direction.z * 400 * delta;
                if (moveLeft || moveRight) velocity.x -= direction.x * 400 * delta;

                const oldPos = controls.getObject().position.clone();
                controls.moveRight(-velocity.x * delta);
                controls.moveForward(-velocity.z * delta);
                const newPos = controls.getObject().position.clone();
                const deltaXZ = newPos.sub(oldPos);

                controls.getObject().position.copy(oldPos);

                const radius = 1.5;
                const py = controls.getObject().position.y;
                let playerBox = new THREE.Box3();

                // Apply X
                controls.getObject().position.x += deltaXZ.x;
                playerBox.set(
                    new THREE.Vector3(controls.getObject().position.x - radius, py - 7.5, controls.getObject().position.z - radius),
                    new THREE.Vector3(controls.getObject().position.x + radius, py + 1, controls.getObject().position.z + radius)
                );
                if (checkCollision(playerBox)) {
                    controls.getObject().position.x = oldPos.x;
                    velocity.x = 0;
                }

                // Apply Z
                controls.getObject().position.z += deltaXZ.z;
                playerBox.set(
                    new THREE.Vector3(controls.getObject().position.x - radius, py - 7.5, controls.getObject().position.z - radius),
                    new THREE.Vector3(controls.getObject().position.x + radius, py + 1, controls.getObject().position.z + radius)
                );
                if (checkCollision(playerBox)) {
                    controls.getObject().position.z = oldPos.z;
                    velocity.z = 0;
                }

                // Apply Y
                controls.getObject().position.y += velocity.y * delta;
                const targetGroundY = getGroundY(controls.getObject().position.x, controls.getObject().position.z, controls.getObject().position.y);
                
                if (controls.getObject().position.y < targetGroundY) {
                    velocity.y = 0;
                    controls.getObject().position.y = targetGroundY;
                    canJump = true;
                }
            }

            // Ghost mesh for building placement
            if (ghostMesh && camera) {
                const rayPoint = controls.isLocked ? new THREE.Vector2(0, 0) : mouse;
                raycaster.setFromCamera(rayPoint, camera);
                const snapTargets = [floorMesh, ...objects.filter(o => o.itemType && (o.itemType.startsWith('Wood') || o.itemType === 'StorageBox'))];
                const hits = raycaster.intersectObjects(snapTargets, true);
                if (hits.length > 0) {
                    const point = hits[0].point;
                    const type = ghostMesh.name;
                    if (type === 'WoodDoor') {
                        // Find if we hit a doorway
                        let hitObj = hits[0].object;
                        let parentDoorway = null;
                        if (hitObj.itemType === 'WoodDoorway') parentDoorway = hitObj;
                        else if (hitObj.parent && hitObj.parent.itemType === 'WoodDoorway') parentDoorway = hitObj.parent;

                        if (parentDoorway) {
                            ghostMesh.position.copy(parentDoorway.position);
                            ghostMesh.position.y -= 2; // Adjust from wall height to door center height
                            ghostMesh.rotation.copy(parentDoorway.rotation);
                            ghostMesh.visible = true;
                        } else {
                            ghostMesh.visible = false;
                        }
                    } else if (type.startsWith('Wood')) {
                        let gridY = point.y;
                        let hitObj = hits[0].object;
                        let rootObj = hitObj;
                        while (rootObj.parent && rootObj.parent.type !== 'Scene') {
                            if (rootObj.itemType) break;
                            rootObj = rootObj.parent;
                        }
                        if (rootObj.itemType && rootObj.itemType.startsWith('Wood')) {
                            if (rootObj.itemType === 'WoodFoundation') gridY = rootObj.position.y - 1;
                            else if (rootObj.itemType === 'WoodWall' || rootObj.itemType === 'WoodDoorway') gridY = rootObj.position.y - 10;
                            else if (rootObj.itemType === 'WoodRoof') gridY = rootObj.position.y - 20.5;
                        }

                        const snapX = Math.round(point.x / 20) * 20;
                        const snapZ = Math.round(point.z / 20) * 20;

                        if (type === 'WoodFoundation') {
                            ghostMesh.position.set(snapX, gridY + 1, snapZ);
                            ghostMesh.rotation.y = 0;
                        } else if (type === 'WoodWall' || type === 'WoodDoorway') {
                            ghostMesh.position.set(snapX, gridY + 10, snapZ);
                            if (Math.abs(point.x % 20) > Math.abs(point.z % 20)) {
                                ghostMesh.rotation.y = 0;
                                ghostMesh.position.z += (point.z % 20 > 0 ? 10 : -10);
                            } else {
                                ghostMesh.rotation.y = Math.PI / 2;
                                ghostMesh.position.x += (point.x % 20 > 0 ? 10 : -10);
                            }
                        } else if (type === 'WoodRoof') {
                            ghostMesh.position.set(snapX, gridY + 20.5, snapZ);
                            ghostMesh.rotation.y = 0;
                        }
                        ghostMesh.visible = true;
                    } else {
                        ghostMesh.position.copy(point);
                        ghostMesh.position.y += (type === 'StorageBox' ? 3 : 1);
                        ghostMesh.visible = true;
                    }
                } else {
                    ghostMesh.visible = false;
                }
            }

            prevTime = time;
            if (renderer && scene && camera) renderer.render(scene, camera);
        }

        /* ===== START ===== */
        init();
        animate();
