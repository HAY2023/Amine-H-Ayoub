const fs = require('fs');

const generateBoy = () => {
    const costs = [15000, 25000, 50000, 75000, 100000, 150000, 200000, 250000, 350000, 400000, 500000, 600000, 750000, 900000, 1000000];
    const tiers = ['bronze', 'bronze', 'silver', 'silver', 'gold', 'gold', 'gold', 'gold', 'diamond', 'diamond', 'diamond', 'legendary', 'legendary', 'legendary', 'legendary'];
    
    let res = 'export const SHOP_AVATARS_BOY: ShopItem[] = [\n';
    for (let i = 1; i <= 15; i++) {
        res += `  { id: "av-img-boy-${i}", type: "avatar", label: "شخصية ولد ${i}", value: "img-boy-${i}", cost: ${costs[i-1]}, tier: "${tiers[i-1]}" },\n`;
    }
    res += '];\n';
    return res;
};

const generateGirl = () => {
    const costs = [15000, 25000, 50000, 75000, 100000, 150000, 200000, 350000, 400000, 500000, 600000, 850000, 1000000];
    const tiers = ['bronze', 'bronze', 'silver', 'silver', 'gold', 'gold', 'gold', 'diamond', 'diamond', 'diamond', 'legendary', 'legendary', 'legendary'];
    
    let res = 'export const SHOP_AVATARS_GIRL: ShopItem[] = [\n';
    for (let i = 1; i <= 13; i++) {
        res += `  { id: "av-img-girl-${i}", type: "avatar", label: "شخصية بنت ${i}", value: "img-girl-${i}", cost: ${costs[i-1]}, tier: "${tiers[i-1]}" },\n`;
    }
    res += '];\n';
    return res;
};

let fileContent = fs.readFileSync('src/data/kidsProfile.ts', 'utf8');

// Find start and end of SHOP_AVATARS
const startIdx = fileContent.indexOf('export const SHOP_AVATARS: ShopItem[] = [');
const endIdx = fileContent.indexOf('export const SHOP_COLORS: ShopItem[] = [');

if (startIdx !== -1 && endIdx !== -1) {
    const newContent = fileContent.substring(0, startIdx) + 
                       generateBoy() + '\n' + generateGirl() + '\n' +
                       'export const SHOP_AVATARS: ShopItem[] = [...SHOP_AVATARS_BOY, ...SHOP_AVATARS_GIRL];\n\n' +
                       fileContent.substring(endIdx);
                       
    fs.writeFileSync('src/data/kidsProfile.ts', newContent, 'utf8');
    console.log('Successfully updated kidsProfile.ts');
} else {
    console.log('Could not find SHOP_AVATARS bounds');
}
