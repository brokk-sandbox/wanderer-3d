export const itemDisplayNames = {
    Wood: 'Wood',
    Rock: 'Rock',
    Leather: 'Leather',
    Meat: 'Raw Meat',
    CookedMeat: 'Cooked Meat',
    Campfire: 'Campfire',
    Workbench: 'Workbench',
    StoneAxe: 'Stone Axe',
    Backpack: 'Backpack',
    StorageBox: 'Storage Box',
    WoodFoundation: 'Wood Foundation',
    WoodWall: 'Wood Wall',
    WoodRoof: 'Wood Roof',
    WoodDoorway: 'Wood Doorway',
    WoodDoor: 'Wood Door',
    Torch: 'Torch',
    PointyStick: 'Pointy Stick',
    Shirt: 'Shirt',
    Pants: 'Pants',
    Leaves: 'Leaves',
    Shrub: 'Shrub',
    Hat: 'Hat'
};

export function getDisplayName(type) {
    return itemDisplayNames[type] || type;
}

export const toolbarLayout = [
    { id: 'toolbar-slot-0', label: 'L-HAND', type: 'equip', slot: 'lhand' },
    { id: 'toolbar-slot-1', label: 'ACT 1', type: 'action', pocketIdx: 0, key: '1' },
    { id: 'toolbar-slot-2', label: 'ACT 2', type: 'action', pocketIdx: 1, key: '2' },
    { id: 'toolbar-slot-3', label: 'ACT 3', type: 'action', pocketIdx: 2, key: '3' },
    { id: 'toolbar-slot-4', label: 'R-HAND', type: 'equip', slot: 'rhand' },
];

export function createSpawnConfig() {
    return {
        Tree: { respawnTime: 60, maxCount: 60, current: 0, timer: 0, label: 'Trees' },
        Rock: { respawnTime: 90, maxCount: 45, current: 0, timer: 0, label: 'Rocks' },
        Shrub: { respawnTime: 45, maxCount: 45, current: 0, timer: 0, label: 'Shrubs' },
        Boar: { respawnTime: 120, maxCount: 8, current: 0, timer: 0, label: 'Boars' }
    };
}

export const recipes = {
    Hand: [
        { result: 'Campfire', cost: { Wood: 3, Rock: 3 } },
        { result: 'Workbench', cost: { Wood: 5, Rock: 2 } },
        { result: 'Backpack', cost: { Leather: 5 } },
        { result: 'Torch', cost: { Wood: 1 } },
        { result: 'PointyStick', cost: { Wood: 2 } }
    ],
    Campfire: [
        { result: 'CookedMeat', cost: { Meat: 1, Wood: 1 } }
    ],
    Workbench: [
        { result: 'StoneAxe', cost: { Wood: 3, Rock: 4 } },
        { result: 'StorageBox', cost: { Wood: 8 } },
        { result: 'WoodFoundation', cost: { Wood: 10 } },
        { result: 'WoodWall', cost: { Wood: 6 } },
        { result: 'WoodRoof', cost: { Wood: 6 } },
        { result: 'WoodDoorway', cost: { Wood: 8 } },
        { result: 'WoodDoor', cost: { Wood: 4 } }
    ]
};

export const WEAPON_TYPES = ['StoneAxe', 'PointyStick', 'Torch'];

export const PLACEABLE_ITEMS = [
    'Campfire',
    'Workbench',
    'StorageBox',
    'WoodFoundation',
    'WoodWall',
    'WoodRoof',
    'WoodDoorway',
    'WoodDoor'
];

export const UNSTACKABLE_ITEMS = [
    'StorageBox',
    'Campfire',
    'Workbench',
    'StoneAxe',
    'Backpack',
    'WoodFoundation',
    'WoodWall',
    'WoodRoof',
    'WoodDoorway',
    'WoodDoor',
    'Torch',
    'PointyStick',
    'Shirt',
    'Pants',
    'Hat'
];
